#!/usr/bin/env python3
"""Isolated single-image smoke tests. Requires Python stdlib and Docker CLI only."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tarfile
import time
import uuid

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent

def docker(*args, input_text=None, timeout=180, check=True):
    result = subprocess.run(['docker', *map(str, args)], input=input_text, text=True, capture_output=True, timeout=timeout)
    if check and result.returncode:
        # Commands never print config bodies or credential values. Keep diagnostics bounded.
        raise RuntimeError('Docker command failed: ' + ' '.join(map(str, args[:3])) + '\n' + (result.stderr or result.stdout)[-4000:])
    return result

def parsed_output(result):
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    if not lines:
        raise RuntimeError('Container check produced no JSON result')
    return json.loads(lines[-1])

def forbidden_context_path(name):
    name = name.replace('\\', '/').lstrip('/')
    while name.startswith('./'):
        name = name[2:]
    if name.startswith('context/'):
        name = name[len('context/'):]
    parts = name.split('/')
    leaf = parts[-1]
    if any(part in ('.git', '.ssh', 'node_modules', 'secrets', 'public.original') for part in parts):
        return True
    if name.startswith(('webguest2/webguest2-src/build/', 'webguest2/webguest2/public/', 'signaling2.0/signaling2.0/config/', 'simple-auth/simple-auth/config/')):
        return True
    if re.search(r'\.(pem|key|pfx|p12|ppk)$', leaf, re.I) or re.fullmatch(r'id_(rsa|dsa|ecdsa|ed25519)(\.pub)?', leaf):
        return True
    return bool(re.match(r'^\.env(?:\.|$)', leaf) and not re.search(r'\.(example|template)$', leaf))

def audit_context(image, name):
    tag = 'codex-meet-context:' + uuid.uuid4().hex[:12]
    container = name + '-context'
    created = False
    try:
        docker('build', '-f', HERE / 'Context.Dockerfile', '-t', tag, ROOT, timeout=600)
        docker('create', '--name', container, tag, '/not-executed')
        created = True
        process = subprocess.Popen(['docker', 'export', container], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        forbidden = []
        entries = 0
        try:
            with tarfile.open(fileobj=process.stdout, mode='r|') as archive:
                for member in archive:
                    entries += 1
                    if forbidden_context_path(member.name):
                        forbidden.append(member.name)
            process.stdout.read()  # Drain tar padding without extracting file contents.
            process.stdout.close()
            stderr = process.stderr.read()
            process.wait(timeout=30)
            if process.returncode:
                raise RuntimeError('Context export failed: ' + stderr.decode(errors='replace')[-1000:])
        finally:
            if process.poll() is None:
                process.kill()
                process.wait()
        if forbidden:
            raise RuntimeError('Build context contains ' + str(len(forbidden)) + ' forbidden paths: ' + ', '.join(forbidden[:30]))
        return {'entries': entries, 'forbiddenPaths': 0}
    finally:
        if created:
            docker('rm', '-f', container, check=False)
        docker('image', 'rm', tag, check=False)

def wait_running(container, timeout):
    until = time.monotonic() + timeout
    while time.monotonic() < until:
        state = json.loads(docker('inspect', '--format', '{{json .State}}', container).stdout)
        if state['Status'] in ('exited', 'dead'):
            raise RuntimeError('Container exited during startup with code ' + str(state['ExitCode']))
        health = state.get('Health', {}).get('Status')
        if state['Status'] == 'running' and health in (None, 'healthy'):
            return health or 'running'
        time.sleep(.5)
    raise RuntimeError('Container health deadline exceeded')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', required=True)
    parser.add_argument('--report', type=Path)
    parser.add_argument('--skip-context-audit', action='store_true', help='Only for focused local reruns; CI should audit the build context.')
    parser.add_argument('--tls-cert', type=Path)
    parser.add_argument('--tls-key', type=Path)
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._/:@-]*', args.image):
        parser.error('Invalid Docker image reference')
    if bool(args.tls_cert) != bool(args.tls_key):
        parser.error('--tls-cert and --tls-key must be supplied together')
    for filename in (args.tls_cert, args.tls_key):
        if filename and not filename.is_file():
            parser.error('TLS fixture file does not exist')
    name = 'webrtc20-package-check-' + uuid.uuid4().hex[:12]
    report = {'image': args.image, 'container': name, 'passed': False}
    created = False
    try:
        image_id = docker('image', 'inspect', '--format', '{{.Id}}', args.image).stdout.strip()
        report['imageId'] = image_id
        if not args.skip_context_audit:
            report['context'] = audit_context(args.image, name)
        audit = docker('run', '--rm', '-i', '--entrypoint', 'node', image_id, '--input-type=module', input_text=(HERE / 'image-audit.mjs').read_text(encoding='utf8'))
        report['imageAudit'] = parsed_output(audit)
        command = ['run', '-d', '--name', name, '--label', 'codex.meet.validation=true', '--read-only', '--tmpfs', '/tmp:rw,nosuid,noexec,size=32m', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '-p', '127.0.0.1::8080']
        if args.tls_cert:
            command += ['-p', '127.0.0.1::8443', '--mount', 'type=bind,src=' + str(args.tls_cert.resolve()) + ',dst=/run/smoke-tls/cert.pem,readonly', '--mount', 'type=bind,src=' + str(args.tls_key.resolve()) + ',dst=/run/smoke-tls/key.pem,readonly', '-e', 'TLS_CERT_FILE=/run/smoke-tls/cert.pem', '-e', 'TLS_KEY_FILE=/run/smoke-tls/key.pem']
        docker(*command, image_id)
        created = True
        report['health'] = wait_running(name, 75)
        report['httpPort'] = docker('port', name, '8080/tcp').stdout.strip()
        node = ['exec', '-i', '-e', 'SMOKE_BASE_URL=http://127.0.0.1:8080']
        if args.tls_cert:
            report['tlsPort'] = docker('port', name, '8443/tcp').stdout.strip()
            node += ['-e', 'SMOKE_TLS_BASE_URL=https://127.0.0.1:8443', '-e', 'NODE_TLS_REJECT_UNAUTHORIZED=0']
        result = docker(*node, name, 'node', '--input-type=module', input_text=(HERE / 'protocol-smoke.mjs').read_text(encoding='utf8'), timeout=100)
        report['protocol'] = parsed_output(result)
        started = time.monotonic()
        docker('stop', '--time', '15', name, timeout=25)
        state = json.loads(docker('inspect', '--format', '{{json .State}}', name).stdout)
        report['shutdown'] = {'seconds': round(time.monotonic() - started, 3), 'exitCode': state['ExitCode'], 'oomKilled': state['OOMKilled']}
        if state['Status'] != 'exited' or state['ExitCode'] not in (0, 143) or state['OOMKilled']:
            raise RuntimeError('Container did not stop gracefully')
        report['passed'] = True
    except (RuntimeError, subprocess.TimeoutExpired, json.JSONDecodeError) as error:
        report['error'] = str(error)
    finally:
        if created:
            docker('rm', '-f', name, check=False)
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
        print(json.dumps(report, indent=2))
    return 0 if report['passed'] else 1

if __name__ == '__main__':
    sys.exit(main())
