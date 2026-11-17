#!/usr/bin/env python3
"""GitLab -> GitHub release lane. Python standard library; no credential output."""
from __future__ import annotations

import argparse
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, quote, urlencode, urljoin, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

MANAGED = "videosdk-meet-gitlab-release-v1"
ARCHIVE = "docker-image-linux-amd64.tar.gz"
MANIFEST = "release-manifest.json"
NOTES = "release-notes.md"
SUMS = "SHA256SUMS"
EXPECTED = {ARCHIVE, MANIFEST, NOTES, SUMS}
SHA = re.compile(r"^[0-9a-f]{40}$")
MARKER = re.compile(r"<!-- videosdk-meet-gitlab-release-v1 project=(\d+) branch=([^ ]+) sha=([0-9a-f]{40}) -->")


class ReleaseError(Exception):
    pass


def canonical(value):
    return (json.dumps(value, sort_keys=True, indent=2, ensure_ascii=False) + "\n").encode("utf-8")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def file_digest(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


class SafeRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urlsplit(req.full_url).scheme == "https" and urlsplit(newurl).scheme != "https":
            raise ReleaseError("Refusing an API redirect to an insecure connection")
        redirected = super().redirect_request(req, fp, code, msg, headers, newurl)
        if redirected and urlsplit(req.full_url).netloc != urlsplit(newurl).netloc:
            redirected.remove_header("Authorization")
            redirected.remove_header("Job-token")
            redirected.remove_header("Private-token")
        return redirected


class API:
    def __init__(self, base, headers):
        self.base, self.headers = base.rstrip("/"), headers
        self.opener = build_opener(SafeRedirect())

    def request(self, method, path, data=None, raw=False, allow=(), headers=None):
        url = urljoin(self.base + "/", path)
        # Never attach credentials to pagination/upload URLs outside this API's
        # origin. GitHub's uploads host is the one explicit exception.
        host = urlsplit(url).netloc
        if urlsplit(self.base).scheme == "https" and urlsplit(url).scheme != "https":
            raise ReleaseError("Refusing an insecure API URL")
        if host != urlsplit(self.base).netloc and not (
            host == "uploads.github.com" and urlsplit(self.base).netloc == "api.github.com"
        ):
            raise ReleaseError("API URL points outside the configured service")
        body = canonical(data) if isinstance(data, (dict, list)) else data
        request_headers = dict(self.headers)
        if isinstance(data, (dict, list)):
            request_headers["Content-Type"] = "application/json"
        request_headers.update(headers or {})
        for attempt in range(5):
            try:
                with self.opener.open(Request(url, data=body, headers=request_headers, method=method), timeout=120) as response:
                    payload = response.read()
                    return response.status, payload if raw else (json.loads(payload) if payload else None), response.headers
            except HTTPError as error:
                if error.code in allow:
                    return error.code, None, error.headers
                # Only GET is automatically retried: mutating calls may have
                # succeeded before their response was lost. Callers reconcile.
                if method == "GET" and error.code in (429, 500, 502, 503, 504) and attempt < 4:
                    time.sleep(min(2 ** attempt, 16))
                    continue
                raise ReleaseError(f"{method} API request failed (HTTP {error.code})") from None
            except (URLError, TimeoutError, OSError, json.JSONDecodeError):
                if method == "GET" and attempt < 4:
                    time.sleep(min(2 ** attempt, 16))
                    continue
                raise ReleaseError(f"{method} API request failed; response must be reconciled before retry") from None

    def get(self, path):
        return self.request("GET", path)[1]

    def pages(self, path):
        seen = set()
        while path:
            if path in seen:
                raise ReleaseError("API pagination loop")
            seen.add(path)
            _, values, headers = self.request("GET", path)
            if not isinstance(values, list):
                raise ReleaseError("Expected a paginated API array")
            yield from values
            next_link = re.search(r'<([^>]+)>;\s*rel="next"', headers.get("Link", ""), re.I)
            if next_link:
                path = next_link.group(1)
            elif headers.get("X-Next-Page"):
                parsed = urlsplit(path)
                query = dict(parse_qsl(parsed.query))
                query["page"] = headers["X-Next-Page"]
                path = urlunsplit(parsed._replace(query=urlencode(query)))
            else:
                path = None


class Git:
    def __init__(self, cwd=None):
        self.cwd = cwd

    def run(self, *args, env=None, check=True):
        result = subprocess.run(["git", *args], cwd=self.cwd, env=env, capture_output=True, text=True, encoding="utf-8")
        if check and result.returncode:
            # Do not print subprocess output: credential helpers and remote
            # servers can include private data in otherwise routine errors.
            raise ReleaseError(f"git {args[0]} failed (exit {result.returncode})")
        return result

    def ancestor(self, older, newer):
        result = self.run("merge-base", "--is-ancestor", older, newer, check=False)
        if result.returncode not in (0, 1):
            raise ReleaseError("Cannot establish source ancestry; fetch complete Git history")
        return result.returncode == 0

    def commits(self, previous, current):
        ref = f"{previous}..{current}" if previous else current
        return self.run("rev-list", "--reverse", "--topo-order", ref).stdout.splitlines()


def decision(git, previous, current):
    if not SHA.fullmatch(current):
        raise ReleaseError("Invalid source commit SHA")
    if previous is None:
        return "build"
    if current == previous:
        return "unchanged"
    if git.ancestor(current, previous):
        return "obsolete"
    if not git.ancestor(previous, current):
        raise ReleaseError("Release history diverged; refusing to rewrite the GitHub mirror")
    return "build"


def marker(project, branch, sha):
    return f"<!-- {MANAGED} project={project} branch={quote(branch, safe='')} sha={sha} -->"


def artifact_record(path):
    return {"name": Path(path).name, "size": Path(path).stat().st_size, "sha256": file_digest(path)}


def parse_sums(data):
    try:
        values = {}
        for line in data.decode("ascii").splitlines():
            match = re.fullmatch(r"([0-9a-f]{64})  ([A-Za-z0-9._-]+)", line)
            if not match or match[2] in values:
                raise ValueError()
            values[match[2]] = match[1]
        return values
    except (UnicodeError, ValueError):
        raise ReleaseError("Invalid SHA256SUMS asset") from None


def validate_checkpoint(manifest_bytes, sums_bytes, assets, project, branch, tag):
    try:
        manifest = json.loads(manifest_bytes)
        source = manifest["source"]
        if manifest["schema"] != 1 or manifest["managed_by"] != MANAGED:
            raise ValueError()
        if str(source["project_id"]) != str(project) or source["branch"] != branch:
            raise ValueError()
        if not SHA.fullmatch(source["sha"]) or tag != "meet-" + source["sha"]:
            raise ValueError()
        records = {v["name"]: v for v in manifest["artifacts"]}
        by_name = {v["name"]: v for v in assets}
        if len(by_name) != len(assets) or set(by_name) != EXPECTED or len(manifest["artifacts"]) != 2 or set(records) != {ARCHIVE, NOTES}:
            raise ValueError()
        sums = parse_sums(sums_bytes)
        if set(sums) != {ARCHIVE, NOTES, MANIFEST} or sums[MANIFEST] != digest(manifest_bytes):
            raise ValueError()
        if by_name[MANIFEST]["size"] != len(manifest_bytes) or by_name[SUMS]["size"] != len(sums_bytes):
            raise ValueError()
        if source.get("previous_sha") is not None and not SHA.fullmatch(source["previous_sha"]):
            raise ValueError()
        for name, asset in by_name.items():
            if asset.get("state") != "uploaded":
                raise ValueError()
            expected_hash = digest(sums_bytes) if name == SUMS else sums[name]
            if asset.get("digest") != "sha256:" + expected_hash:
                raise ValueError()
            if name in records and (records[name]["sha256"] != expected_hash or records[name]["size"] != asset["size"]):
                raise ValueError()
        return manifest
    except (ValueError, KeyError, TypeError, AttributeError):
        raise ReleaseError("Published managed release failed manifest/asset verification") from None


def selected_mrs(mrs, introduced):
    selected = {}
    for mr in mrs:
        if mr.get("state") != "merged":
            continue
        integration = mr.get("merge_commit_sha") or mr.get("squash_commit_sha") or mr.get("sha")
        if integration in introduced or mr.get("squash_commit_sha") in introduced:
            selected[(mr["project_id"], mr["iid"])] = mr
    return sorted(selected.values(), key=lambda m: (str(m.get("merged_at") or ""), m["project_id"], m["iid"]))


def notes(git, gitlab, project, project_url, previous, current):
    commits = git.commits(previous, current)
    introduced = set(commits)
    associations, candidates = {}, []
    root = f"projects/{quote(str(project), safe='')}"
    # Both sources are necessary: commit associations identify direct commits;
    # the MR list also includes merge/squash integration records.
    for sha in commits:
        associations[sha] = list(gitlab.pages(f"{root}/repository/commits/{sha}/merge_requests?per_page=100"))
        candidates.extend(associations[sha])
    candidates.extend(gitlab.pages(f"{root}/merge_requests?state=merged&scope=all&per_page=100"))
    merged = selected_mrs(candidates, introduced)
    keys = {(m["project_id"], m["iid"]) for m in merged}
    integration = {h for m in merged for h in (m.get("merge_commit_sha"), m.get("squash_commit_sha"), m.get("sha")) if h}
    direct = [sha for sha in commits if sha not in integration and not any(
        (m["project_id"], m["iid"]) in keys for m in associations[sha]
    )]
    def title(sha):
        return git.run("show", "-s", "--format=%s", sha).stdout.strip().replace("\n", " ")
    def escape(text):
        return re.sub(r"([\\`*_[\]<>])", r"\\\1", str(text)).replace("\n", " ").replace("\r", " ")
    lines = ["# WebRTC 2.0 signaling server", "", f"Source: `{current}`", "",
             f"Previous release: `{previous}`" if previous else "Initial release: all available GitLab history.", "",
             "## Merged requests", ""]
    lines.extend(f"- [!{m['iid']}]({m['web_url']}) {escape(m['title'])}" for m in merged)
    if not merged:
        lines.append("No merged requests in this commit range.")
    lines.extend(["", "## Direct commits", ""])
    lines.extend(f"- [{sha[:12]}]({project_url}/-/commit/{sha}) {escape(title(sha))}" for sha in direct)
    if not direct:
        lines.append("No additional direct commits.")
    lines.extend(["", "## Complete commit list", ""])
    lines.extend(f"- [{sha[:12]}]({project_url}/-/commit/{sha}) {escape(title(sha))}" for sha in commits)
    return "\n".join(lines) + "\n", {"commits": commits, "merge_requests": [
        {"project_id": m["project_id"], "iid": m["iid"], "title": m["title"], "url": m["web_url"]} for m in merged
    ], "direct_commits": direct}


class Release:
    def __init__(self, env=None):
        self.env = dict(os.environ if env is None else env)
        self.project = self.env.get("CI_PROJECT_ID", "")
        self.branch = self.env.get("CI_COMMIT_BRANCH", "")
        self.sha = self.env.get("CI_COMMIT_SHA", "")
        self.repo = self.env.get("GITHUB_REPOSITORY", "")
        self.token = self.env.get("GITHUB_TOKEN", "")
        if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", self.repo):
            raise ReleaseError("GITHUB_REPOSITORY must be owner/repository")
        if not self.project.isdigit() or not self.branch or self.branch != self.env.get("CI_DEFAULT_BRANCH"):
            raise ReleaseError("Release must run on the GitLab default branch")
        if self.env.get("CI_COMMIT_REF_PROTECTED") != "true":
            raise ReleaseError("Release branch must be protected")
        if not SHA.fullmatch(self.sha) or not self.token:
            raise ReleaseError("A source SHA and protected GITHUB_TOKEN are required")
        if self.env.get("PUBLISH_GHCR", "false").lower() not in ("true", "false"):
            raise ReleaseError("PUBLISH_GHCR must be true or false")
        if self.env.get("PUBLISH_GHCR", "false").lower() == "true" and not (
            self.env.get("GHCR_TOKEN") and re.fullmatch(r"[A-Za-z0-9-]+", self.env.get("GHCR_USERNAME", ""))
        ):
            raise ReleaseError("Optional GHCR publishing requires GHCR_TOKEN and GHCR_USERNAME")
        self.github = API("https://api.github.com/", {"Authorization": "Bearer " + self.token,
            "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2026-03-10", "User-Agent": MANAGED})
        self.gitlab = API(self.env.get("CI_API_V4_URL", "") + "/", {"JOB-TOKEN": self.env.get("CI_JOB_TOKEN", "")})
        self.git = Git()
        self.prefix = f"repos/{self.repo}"
        self.tag = "meet-" + self.sha

    def assets(self, release):
        return list(self.github.pages(f"{self.prefix}/releases/{release['id']}/assets?per_page=100"))

    def checkpoint(self):
        latest = None
        previous = None
        for release in self.github.pages(f"{self.prefix}/releases?per_page=100"):
            match = MARKER.search(release.get("body") or "")
            if not match or match[1] != self.project or match[2] != quote(self.branch, safe="") or release.get("draft"):
                continue
            if release.get("prerelease"):
                raise ReleaseError("Managed checkpoint unexpectedly marked as a prerelease")
            sha = match[3]
            if previous is None or self.git.ancestor(previous, sha):
                previous, latest = sha, release
            elif not self.git.ancestor(sha, previous):
                raise ReleaseError("Published releases have divergent source ancestry")
        if latest is None:
            return None
        # Choose by Git ancestry from the small release listing, then verify
        # only the current checkpoint. Never download historical Docker assets.
        assets = self.assets(latest)
        by_name = {v["name"]: v for v in assets}
        if MANIFEST not in by_name or SUMS not in by_name:
            raise ReleaseError("Published managed release is incomplete")
        manifest_bytes = self.github.request("GET", by_name[MANIFEST]["url"], raw=True, headers={"Accept": "application/octet-stream"})[1]
        sums_bytes = self.github.request("GET", by_name[SUMS]["url"], raw=True, headers={"Accept": "application/octet-stream"})[1]
        manifest = validate_checkpoint(manifest_bytes, sums_bytes, assets, self.project, self.branch, latest["tag_name"])
        if manifest["source"]["sha"] != previous:
            raise ReleaseError("Release marker and manifest disagree")
        tag = self.github.get(f"{self.prefix}/git/ref/tags/{quote(latest['tag_name'], safe='')}")
        if tag["object"]["type"] != "commit" or tag["object"]["sha"] != previous:
            raise ReleaseError("Managed release tag does not match source SHA")
        return previous

    def preflight(self, output):
        previous = self.checkpoint()
        outcome = decision(self.git, previous, self.sha)
        tag = self.env.get("RELEASE_RUNNER_TAG", "plant01")
        if not re.fullmatch(r"[A-Za-z0-9_.-]+", tag):
            raise ReleaseError("Invalid RELEASE_RUNNER_TAG")
        # JSON scalars are also valid YAML scalars; no generated includes or
        # cross-pipeline artifacts/variables are needed by the heavy job.
        if outcome == "build":
            content = ('stages: [release]\nrelease:\n  stage: release\n'
                       f'  tags: [linux, shell, {json.dumps(tag)}]\n  interruptible: false\n'
                       '  script:\n    - python3 ci/release/release.py run\n')
        else:
            content = ('stages: [skip]\nunchanged:\n  stage: skip\n'
                       f'  tags: [linux, shell, {json.dumps(tag)}]\n  script:\n    - echo "Source already released; no Docker job created"\n')
        Path(output).write_text(content, encoding="utf-8")
        print(f"Preflight: {outcome}; source {self.sha}; checkpoint {previous or 'none'}")

    def command(self, args, **kwargs):
        try:
            result = subprocess.run(args, check=False, **kwargs)
        except OSError:
            raise ReleaseError(f"Required tool unavailable: {args[0]}") from None
        if result.returncode:
            raise ReleaseError(f"{args[0]} command failed (exit {result.returncode})")
        return result

    def mirror(self):
        env = dict(self.env)
        credential = base64.b64encode(("x-access-token:" + self.token).encode()).decode()
        env.update({"GIT_TERMINAL_PROMPT": "0", "GIT_CONFIG_COUNT": "2",
                    "GIT_CONFIG_KEY_0": "credential.helper", "GIT_CONFIG_VALUE_0": "",
                    "GIT_CONFIG_KEY_1": "http.https://github.com/.extraheader", "GIT_CONFIG_VALUE_1": "AUTHORIZATION: basic " + credential})
        remote = f"https://github.com/{self.repo}.git"
        # Explicit refs only: never mirror/prune/force unrelated GitHub refs.
        # An existing different tag or diverged main makes this push fail.
        self.git.run("push", "--atomic", remote, f"{self.sha}:refs/heads/{self.branch}", f"{self.sha}:refs/tags/{self.tag}", env=env)

    def draft(self):
        matches = [r for r in self.github.pages(f"{self.prefix}/releases?per_page=100") if r["tag_name"] == self.tag]
        if len(matches) > 1:
            raise ReleaseError("Multiple releases use the managed source tag")
        if matches:
            release = matches[0]
            self.verify_draft(release)
            return release
        payload = {"tag_name": self.tag, "target_commitish": self.sha, "name": "WebRTC 2.0 " + self.sha[:12],
                   "body": marker(self.project, self.branch, self.sha), "draft": True, "prerelease": False}
        try:
            release = self.github.request("POST", f"{self.prefix}/releases", payload)[1]
        except ReleaseError:
            # A POST response can be lost after creation. Reconcile on the next
            # retry rather than creating another release or publishing blindly.
            raise ReleaseError("Draft creation did not complete cleanly; retry safely to reconcile") from None
        self.verify_draft(release)
        return release

    def verify_draft(self, release, expected_id=None):
        if (not isinstance(release, dict) or not release.get("id")
                or (expected_id is not None and release["id"] != expected_id)
                or release.get("draft") is not True
                or release.get("prerelease") is not False
                or release.get("tag_name") != self.tag
                or marker(self.project, self.branch, self.sha) not in (release.get("body") or "")):
            raise ReleaseError("Release is not the expected automation-owned tagged draft")

    def verify_publication_draft(self, release_id):
        # Do not rely on the creation response or a stale listing after uploads.
        self.verify_draft(self.github.get(f"{self.prefix}/releases/{release_id}"), release_id)
        tag = self.github.get(f"{self.prefix}/git/ref/tags/{quote(self.tag, safe='')}")
        if tag["object"]["type"] != "commit" or tag["object"]["sha"] != self.sha:
            raise ReleaseError("Release tag changed before publication")

    def upload(self, release, directory):
        existing = {a["name"]: a for a in self.assets(release)}
        if set(existing) - EXPECTED:
            raise ReleaseError("Managed draft has unexpected assets; refusing to delete them")
        for name in sorted(EXPECTED):
            path = directory / name
            size, checksum = path.stat().st_size, file_digest(path)
            if size >= 2 * 1024 ** 3:
                raise ReleaseError(f"{name} exceeds the GitHub release-asset size limit")
            old = existing.get(name)
            if old and old.get("state") == "uploaded" and old["size"] == size and old.get("digest") == "sha256:" + checksum:
                continue
            if old:
                # Only the automation's OWN UNPUBLISHED draft can be repaired.
                if not self.github.get(f"{self.prefix}/releases/{release['id']}")["draft"]:
                    raise ReleaseError("Release was published during upload; refusing asset mutation")
                self.github.request("DELETE", f"{self.prefix}/releases/assets/{old['id']}")
            url = release["upload_url"].split("{", 1)[0] + "?name=" + quote(name, safe="")
            with path.open("rb") as stream:
                # urllib accepts a file body, streaming large Docker archives.
                self.github.request("POST", url, stream, headers={"Content-Type": "application/octet-stream", "Content-Length": str(size)})
        assets = self.assets(release)
        validate_checkpoint((directory / MANIFEST).read_bytes(), (directory / SUMS).read_bytes(), assets, self.project, self.branch, self.tag)

    def registry(self):
        if hasattr(self, "_registry"):
            return self._registry
        repository = self.repo.lower()
        basic = base64.b64encode((self.env["GHCR_USERNAME"] + ":" + self.env["GHCR_TOKEN"]).encode()).decode()
        auth = API("https://ghcr.io/", {"Authorization": "Basic " + basic, "User-Agent": MANAGED})
        token = auth.get("token?service=ghcr.io&scope=" + quote("repository:" + repository + ":pull", safe=""))["token"]
        registry = API("https://ghcr.io/", {"Authorization": "Bearer " + token,
            "Accept": "application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json"})
        path = f"v2/{repository}/manifests/{self.sha}"
        self._registry = registry, path, f"ghcr.io/{repository}:{self.sha}"
        return self._registry

    def registry_docker_env(self, directory):
        config = directory / "docker-auth"
        config.mkdir(exist_ok=True)
        env = dict(self.env, DOCKER_CONFIG=str(config))
        self.command(["docker", "login", "ghcr.io", "--username", self.env["GHCR_USERNAME"], "--password-stdin"],
                     input=self.env["GHCR_TOKEN"] + "\n", text=True, capture_output=True, env=env)
        return env

    def restore_ghcr(self, image, directory):
        if self.env.get("PUBLISH_GHCR", "false").lower() != "true":
            return False
        registry, path, target = self.registry()
        status, manifest, headers = registry.request("GET", path, allow=(404,))
        if status == 404:
            return False
        config_id = manifest.get("config", {}).get("digest", "")
        checksum = headers.get("Docker-Content-Digest", "")
        if not all(re.fullmatch(r"sha256:[0-9a-f]{64}", v) for v in (config_id, checksum)):
            raise ReleaseError("Existing GHCR tag has invalid image digests")
        config_bytes = registry.request("GET", f"v2/{self.repo.lower()}/blobs/{config_id}", raw=True)[1]
        if "sha256:" + digest(config_bytes) != config_id:
            raise ReleaseError("Existing GHCR config checksum failed")
        config = json.loads(config_bytes)
        labels = config.get("config", {}).get("Labels") or {}
        if labels.get("org.opencontainers.image.revision") != self.sha or labels.get("org.opencontainers.image.source") != f"https://github.com/{self.repo}":
            raise ReleaseError("Existing GHCR source tag does not match this repository/revision")
        pinned = target.rsplit(":", 1)[0] + "@" + checksum
        env = self.registry_docker_env(directory)
        self.command(["docker", "pull", "--platform", "linux/amd64", pinned], env=env)
        inspected = self.command(["docker", "image", "inspect", pinned], capture_output=True, text=True, env=env)
        if json.loads(inspected.stdout)[0]["Id"] != config_id:
            raise ReleaseError("Restored GHCR image does not match its content digest")
        self.command(["docker", "tag", pinned, image], env=env)
        print("Reusing the verified GHCR image for this source SHA")
        return True

    def publish_ghcr(self, image, image_id, directory):
        if self.env.get("PUBLISH_GHCR", "false").lower() != "true":
            return None
        registry, path, target = self.registry()
        status, manifest, headers = registry.request("GET", path, allow=(404,))
        if status != 404 and manifest.get("config", {}).get("digest") != image_id:
            raise ReleaseError("Existing GHCR source tag has different contents; refusing to overwrite it")
        if status == 404:
            env = self.registry_docker_env(directory)
            self.command(["docker", "tag", image, target], env=env)
            # A failed/lost push response cannot advance the release checkpoint.
            # Retry rechecks the existing immutable source tag before pushing.
            self.command(["docker", "push", target], env=env)
            status, manifest, headers = registry.request("GET", path)
        checksum = headers.get("Docker-Content-Digest", "")
        if manifest.get("config", {}).get("digest") != image_id or not re.fullmatch(r"sha256:[0-9a-f]{64}", checksum):
            raise ReleaseError("GHCR verification did not match the local image")
        return {"name": target, "digest": checksum}

    def save_image(self, image, path):
        with path.open("wb") as raw:
            with gzip.GzipFile(fileobj=raw, filename="", mode="wb", mtime=0) as compressed:
                process = subprocess.Popen(["docker", "save", image], stdout=subprocess.PIPE)
                assert process.stdout
                try:
                    for block in iter(lambda: process.stdout.read(1024 * 1024), b""):
                        compressed.write(block)
                finally:
                    process.stdout.close()
                if process.wait():
                    raise ReleaseError("docker save failed")

    def run(self):
        previous = self.checkpoint()
        outcome = decision(self.git, previous, self.sha)
        if outcome != "build":
            print(f"Release recheck: {outcome}; nothing to publish")
            return
        # All source operations run at the immutable pipeline SHA, never the
        # moving branch tip. The runner checkout must be pristine.
        if self.git.run("rev-parse", "HEAD").stdout.strip() != self.sha:
            raise ReleaseError("Runner checkout does not match CI_COMMIT_SHA")
        if self.git.run("status", "--porcelain", "--untracked-files=no").stdout.strip():
            raise ReleaseError("Runner checkout has modified tracked files")
        with tempfile.TemporaryDirectory(prefix="meet-release-") as temp:
            directory = Path(temp)
            note_text, changes = notes(self.git, self.gitlab, self.project, self.env["CI_PROJECT_URL"], previous, self.sha)
            (directory / NOTES).write_text(note_text, encoding="utf-8")
            image = "videosdk-meet:" + self.sha
            if not self.restore_ghcr(image, directory):
                epoch = self.git.run("show", "-s", "--format=%ct", self.sha).stdout.strip()
                if not epoch.isdigit():
                    raise ReleaseError("Invalid commit timestamp for SOURCE_DATE_EPOCH")
                self.command(["docker", "build", "--platform", "linux/amd64", "--build-arg", "VERSION=meet-" + self.sha[:12],
                              "--build-arg", "VCS_REF=" + self.sha, "--build-arg", "SOURCE_DATE_EPOCH=" + epoch,
                              "--tag", image, "."])
            # Container smoke tests are a release gate, supplied by this repo.
            self.command(["python3", "tests/container/smoke.py", "--image", image])
            inspected = self.command(["docker", "image", "inspect", image], capture_output=True, text=True)
            metadata = json.loads(inspected.stdout)[0]
            if metadata["Os"] != "linux" or metadata["Architecture"] != "amd64":
                raise ReleaseError("Docker build did not produce linux/amd64")
            registry_image = self.publish_ghcr(image, metadata["Id"], directory)
            self.save_image(image, directory / ARCHIVE)
            manifest = {"schema": 1, "managed_by": MANAGED,
                        "source": {"project_id": int(self.project), "branch": self.branch, "sha": self.sha, "previous_sha": previous},
                        "image": {"name": image, "id": metadata["Id"], "platform": "linux/amd64"},
                        "changes": changes, "artifacts": [artifact_record(directory / n) for n in (ARCHIVE, NOTES)]}
            if registry_image:
                manifest["image"]["registry"] = registry_image
            (directory / MANIFEST).write_bytes(canonical(manifest))
            (directory / SUMS).write_text("".join(f"{file_digest(directory / n)}  {n}\n" for n in (ARCHIVE, NOTES, MANIFEST)), encoding="ascii")
            if any((directory / name).stat().st_size >= 2 * 1024 ** 3 for name in EXPECTED):
                raise ReleaseError("Release asset exceeds GitHub's 2 GiB limit; no release will be published")
            # Assets are completely built and tested before remote mutations.
            self.mirror()
            release = self.draft()
            self.upload(release, directory)
            body = marker(self.project, self.branch, self.sha) + "\n\n" + note_text
            # GitHub limits release bodies; retain COMPLETE notes as an asset.
            if len(body.encode("utf-8")) > 100000:
                body = marker(self.project, self.branch, self.sha) + "\n\nFull release notes are attached as release-notes.md.\n"
            self.verify_publication_draft(release["id"])
            # GitHub removes the existing tag when a release PATCH omits
            # tag_name (also guarded in GitHub CLI's release edit command).
            # Send all identity/state fields with the notes in ONE final call;
            # a metadata-only PATCH must never detach or publish the draft.
            publication = {"tag_name": self.tag, "target_commitish": self.sha,
                           "body": body, "draft": False, "prerelease": False, "make_latest": "true"}
            try:
                self.github.request("PATCH", f"{self.prefix}/releases/{release['id']}", publication)
            except ReleaseError:
                # Publication is the ONLY checkpoint transition. A lost response
                # is successful only if a fresh full verification sees this SHA.
                if self.checkpoint() != self.sha:
                    raise
            if self.checkpoint() != self.sha:
                raise ReleaseError("Published release verification did not confirm the source SHA")
            print(f"Published {self.repo} {self.tag}; all assets verified")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("preflight", "run"))
    parser.add_argument("--output", default="generated-release.yml")
    args = parser.parse_args()
    try:
        release = Release()
        release.preflight(args.output) if args.command == "preflight" else release.run()
    except (ReleaseError, KeyError, ValueError, OSError) as error:
        # Never include request bodies, credentials, or command environment.
        print(f"Release failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
