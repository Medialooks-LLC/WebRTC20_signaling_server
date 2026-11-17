"""Offline release tests: real Git ancestry, fake paginated services and Docker."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import types
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

spec = importlib.util.spec_from_file_location("meet_release", Path(__file__).with_name("release.py"))
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)
A, B, C = "a" * 40, "b" * 40, "c" * 40


def bundle(sha=A, previous=None, archive=b"docker archive"):
    data = {r.ARCHIVE: archive, r.NOTES: b"complete release notes\n"}
    manifest = {"schema": 1, "managed_by": r.MANAGED,
                "source": {"project_id": 143, "branch": "main", "sha": sha, "previous_sha": previous},
                "artifacts": [{"name": name, "size": len(raw), "sha256": r.digest(raw)} for name, raw in data.items()]}
    data[r.MANIFEST] = r.canonical(manifest)
    data[r.SUMS] = "".join(f"{r.digest(data[n])}  {n}\n" for n in (r.ARCHIVE, r.NOTES, r.MANIFEST)).encode()
    return data


def assets(data):
    return [{"id": i + 1, "name": name, "size": len(raw), "state": "uploaded", "digest": "sha256:" + r.digest(raw),
             "url": f"asset/{name}"} for i, (name, raw) in enumerate(data.items())]


class Graph:
    def __init__(self, edges=()):
        self.edges = set(edges)

    def ancestor(self, older, newer):
        return older == newer or (older, newer) in self.edges


class GitRepo(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name)
        self.git = r.Git(self.path)
        self.git.run("init", "-b", "main")
        self.git.run("config", "user.name", "Release tests")
        self.git.run("config", "user.email", "release-tests@example.invalid")

    def commit(self, title):
        self.git.run("commit", "--allow-empty", "-m", title)
        return self.git.run("rev-parse", "HEAD").stdout.strip()


class AncestryTests(GitRepo):
    def test_bootstrap_same_stale_and_descendant(self):
        one = self.commit("initial")
        two = self.commit("second")
        self.assertEqual(r.decision(self.git, None, one), "build")
        self.assertEqual(r.decision(self.git, one, one), "unchanged")
        self.assertEqual(r.decision(self.git, two, one), "obsolete")
        self.assertEqual(r.decision(self.git, one, two), "build")
        self.assertEqual(self.git.commits(one, two), [two])

    def test_divergence_and_missing_history_fail(self):
        base = self.commit("initial")
        one = self.commit("left")
        self.git.run("checkout", "-b", "other", base)
        two = self.commit("right")
        with self.assertRaisesRegex(r.ReleaseError, "diverged"):
            r.decision(self.git, one, two)
        with self.assertRaisesRegex(r.ReleaseError, "complete Git history"):
            r.decision(self.git, A, two)

    def test_all_parents_include_old_side_branch(self):
        base = self.commit("base")
        self.git.run("checkout", "-b", "feature")
        side = self.commit("old branch change")
        self.git.run("checkout", "main")
        previous = self.commit("previous release")
        self.git.run("merge", "--no-ff", "feature", "-m", "merge old feature")
        head = self.git.run("rev-parse", "HEAD").stdout.strip()
        self.assertEqual(self.git.commits(previous, head), [side, head])


class PaginationTests(unittest.TestCase):
    def test_link_paginates_beyond_100_and_checks_loop(self):
        api = r.API("https://api.example.invalid/", {})
        calls = []
        def request(method, path):
            calls.append(path)
            if len(calls) == 1:
                return 200, list(range(100)), {"Link": '<https://api.example.invalid/list?page=2>; rel="next"'}
            return 200, [100, 101], {}
        api.request = request
        self.assertEqual(list(api.pages("list?per_page=100")), list(range(102)))
        self.assertEqual(len(calls), 2)
        api.request = lambda *_: (200, [], {"Link": '<loop>; rel="next"'})
        with self.assertRaisesRegex(r.ReleaseError, "pagination loop"):
            list(api.pages("loop"))

    def test_gitlab_next_page_header(self):
        api = r.API("https://gitlab.example.invalid/api/v4", {})
        api.request = lambda method, path: (200, [2], {}) if "page=2" in path else (200, [1], {"X-Next-Page": "2"})
        self.assertEqual(list(api.pages("list?per_page=100")), [1, 2])

    def test_off_origin_api_url_rejected_without_credentials_sent(self):
        api = r.API("https://api.example.invalid/", {"Authorization": "private-test-value"})
        with patch.object(api.opener, "open") as opened:
            with self.assertRaisesRegex(r.ReleaseError, "outside"):
                api.get("https://evil.invalid/list")
            opened.assert_not_called()

    def test_redirect_drops_cross_origin_authorization(self):
        req = r.Request("https://api.github.com/asset", headers={"Authorization": "private-test-value"})
        out = r.SafeRedirect().redirect_request(req, None, 302, "", {}, "https://release-assets.githubusercontent.com/file")
        self.assertFalse(out.has_header("Authorization"))

    def test_api_and_redirect_refuse_tls_downgrade(self):
        api = r.API("https://api.example.invalid/", {"Authorization": "private-test-value"})
        with self.assertRaisesRegex(r.ReleaseError, "insecure"):
            api.get("http://api.example.invalid/list")
        req = r.Request("https://api.example.invalid/asset", headers={"Authorization": "private-test-value"})
        with self.assertRaisesRegex(r.ReleaseError, "insecure"):
            r.SafeRedirect().redirect_request(req, None, 302, "", {}, "http://api.example.invalid/asset")


class ManifestTests(unittest.TestCase):
    def test_complete_bundle_verifies(self):
        data = bundle()
        out = r.validate_checkpoint(data[r.MANIFEST], data[r.SUMS], assets(data), "143", "main", "meet-" + A)
        self.assertEqual(out["source"]["sha"], A)

    def test_asset_and_source_tampering_fail_closed(self):
        for mutation in ("missing", "digest", "size", "starter", "duplicate", "foreign", "tag", "manifest", "sums"):
            with self.subTest(mutation=mutation):
                data = bundle()
                values = assets(data)
                project, tag = "143", "meet-" + A
                if mutation == "missing": values.pop()
                if mutation == "digest": values[0]["digest"] = "sha256:" + "0" * 64
                if mutation == "size": values[0]["size"] += 1
                if mutation == "starter": values[0]["state"] = "starter"
                if mutation == "duplicate": values.append(values[0])
                if mutation == "foreign": project = "144"
                if mutation == "tag": tag = "meet-" + B
                if mutation == "manifest": data[r.MANIFEST] += b" "
                if mutation == "sums": data[r.SUMS] = b"broken"
                with self.assertRaises(r.ReleaseError):
                    r.validate_checkpoint(data[r.MANIFEST], data[r.SUMS], values, project, "main", tag)

    def test_duplicate_checksum_names_rejected(self):
        with self.assertRaises(r.ReleaseError):
            r.parse_sums(("0" * 64 + "  a\n") .encode() * 2)


def mr(iid, merge=None, squash=None, head=None, state="merged", **kwargs):
    return {"project_id": 143, "iid": iid, "title": "Change " + str(iid), "web_url": f"https://gitlab.invalid/mr/{iid}",
            "state": state, "merge_commit_sha": merge, "squash_commit_sha": squash, "sha": head,
            "merged_at": "1900-01-01T00:00:00Z", **kwargs}


class NotesTests(unittest.TestCase):
    def test_merge_squash_ff_rebase_nested_dedup_and_unrelated(self):
        values = [mr(1, merge=A), mr(2, squash=B), mr(3, head=C), mr(4, merge="d" * 40), mr(1, merge=A),
                  mr(5, merge="e" * 40, head=A), mr(6, merge=A, state="opened"), mr(7, merge=B, target_branch="feature")]
        selected = r.selected_mrs(values, {A, B, C})
        self.assertEqual([m["iid"] for m in selected], [1, 2, 3, 7])

    def test_direct_commits_and_full_list_remain_with_no_mr_metadata(self):
        git = types.SimpleNamespace(commits=lambda *_: [A, B], run=lambda *_: types.SimpleNamespace(stdout="Direct [change]\n"))
        api = types.SimpleNamespace(pages=lambda _: iter([]))
        text, changes = r.notes(git, api, "143", "https://gitlab.invalid/project", None, B)
        self.assertEqual(changes["direct_commits"], [A, B])
        self.assertEqual(changes["commits"], [A, B])
        self.assertIn("all available GitLab history", text)
        self.assertIn("Direct \\[change\\]", text)

    def test_integration_endpoint_supplements_associations_and_dates_not_filter(self):
        git = types.SimpleNamespace(commits=lambda *_: [A, B, C], run=lambda *_: types.SimpleNamespace(stdout="A change\n"))
        paths = []
        def pages(path):
            paths.append(path)
            if "/commits/" in path and A in path:
                return iter([mr(1, merge=B)])
            if "/merge_requests?state=merged" in path:
                return iter([mr(1, merge=B), mr(2, squash=C)])
            return iter([])
        _, changes = r.notes(git, types.SimpleNamespace(pages=pages), "143", "https://gitlab.invalid/project", "d" * 40, C)
        self.assertEqual([m["iid"] for m in changes["merge_requests"]], [1, 2])
        self.assertEqual(changes["direct_commits"], [])
        self.assertTrue(all("updated_after" not in p and "merged_after" not in p for p in paths))


class FakeHub:
    def __init__(self):
        self.releases, self.files, self.tags = [], {}, {}
        self.events, self.fail = [], None
        self.next_asset = 100
        self.patch_payloads = []
        self.before_publication = None

    def pages(self, path):
        if "/assets?" in path:
            release_id = int(path.split("/releases/")[1].split("/")[0])
            return iter(copy.deepcopy(self.get_release(release_id)["assets"]))
        return iter(copy.deepcopy(self.releases))

    def get_release(self, release_id):
        return next(v for v in self.releases if v["id"] == release_id)

    def get(self, path):
        return self.request("GET", path)[1]

    def request(self, method, path, data=None, raw=False, **kwargs):
        self.events.append((method, path))
        if method == "GET" and path.startswith("asset/"):
            return 200, self.files[path], {}
        if method == "GET" and "/git/ref/tags/" in path:
            return 200, {"object": {"type": "commit", "sha": self.tags[path.split("/tags/")[1]]}}, {}
        if method == "GET" and "/releases/" in path:
            release = self.get_release(int(path.rsplit("/", 1)[1]))
            if self.before_publication and len(release.get("assets", [])) == len(r.EXPECTED):
                self.before_publication(release)
            return 200, copy.deepcopy(release), {}
        if method == "POST" and path.endswith("/releases"):
            if self.fail == "draft": raise r.ReleaseError("simulated draft failure")
            release = dict(data, id=len(self.releases) + 1, assets=[], upload_url="https://uploads.github.com/upload/{?name}")
            self.releases.append(release)
            if self.fail == "lost-draft-response":
                raise r.ReleaseError("lost response after draft creation")
            return 201, copy.deepcopy(release), {}
        if method == "POST" and path.startswith("https://uploads.github.com/"):
            if self.fail == "upload": raise r.ReleaseError("simulated upload failure")
            name = parse_qs(urlsplit(path).query)["name"][0]
            content = data.read()
            asset = assets({name: content})[0]
            asset["id"] = self.next_asset
            self.next_asset += 1
            self.releases[-1]["assets"].append(asset)
            self.files[asset["url"]] = content
            if self.fail == "lost-upload-response":
                raise r.ReleaseError("lost response after upload")
            return 201, copy.deepcopy(asset), {}
        if method == "DELETE":
            aid = int(path.rsplit("/", 1)[1])
            for release in self.releases:
                release["assets"] = [v for v in release["assets"] if v["id"] != aid]
            return 204, None, {}
        if method == "PATCH":
            release = self.get_release(int(path.rsplit("/", 1)[1]))
            self.patch_payloads.append(copy.deepcopy(data))
            if data.get("draft") is False and self.fail == "publish":
                raise r.ReleaseError("simulated publish failure")
            if "body" in data and self.fail == "notes":
                raise r.ReleaseError("simulated notes failure")
            # Real GitHub does NOT preserve the existing tag when omitted from
            # PATCH. A plain dict.update hid the first real publication defect.
            # Model state defaults too: metadata-only writes are not safe gates.
            release.update({"tag_name": "untagged-test-placeholder", "draft": False, "prerelease": False}, **data)
            if data.get("draft") is False and self.fail == "lost-publish-response":
                raise r.ReleaseError("lost response after publication")
            return 200, copy.deepcopy(release), {}
        raise AssertionError((method, path))

    def published(self, sha=A, previous=None):
        content = bundle(sha, previous)
        item = {"id": len(self.releases) + 1, "tag_name": "meet-" + sha, "draft": False, "prerelease": False,
                "body": r.marker("143", "main", sha), "assets": assets(content)}
        self.releases.append(item)
        self.files.update({a["url"]: content[a["name"]] for a in item["assets"]})
        self.tags[item["tag_name"]] = sha
        return item


def release_object(git=None):
    release = object.__new__(r.Release)
    release.env = {"CI_PROJECT_URL": "https://gitlab.invalid/project", "RELEASE_RUNNER_TAG": "plant01", "PUBLISH_GHCR": "false"}
    release.project, release.branch, release.sha, release.repo, release.tag = "143", "main", A, "owner/repo", "meet-" + A
    release.prefix, release.token = "repos/owner/repo", "not-a-real-token"
    release.git = git or Graph()
    release.github = FakeHub()
    release.gitlab = types.SimpleNamespace(pages=lambda _: iter([]))
    return release


class CheckpointTests(unittest.TestCase):
    def test_ignores_drafts_and_foreign_releases(self):
        release = release_object()
        release.github.published()["draft"] = True
        release.github.releases.append({"draft": False, "body": "unrelated", "tag_name": "v1"})
        self.assertIsNone(release.checkpoint())

    def test_bad_published_checkpoint_fails_instead_of_ignoring(self):
        release = release_object()
        item = release.github.published()
        item["assets"].pop()
        with self.assertRaises(r.ReleaseError): release.checkpoint()

    def test_tag_and_marker_must_match_manifest(self):
        for field in ("tag", "marker"):
            with self.subTest(field=field):
                release = release_object()
                item = release.github.published()
                if field == "tag": release.github.tags[item["tag_name"]] = B
                else: item["body"] = r.marker("143", "main", B)
                with self.assertRaises(r.ReleaseError): release.checkpoint()

    def test_checkpoint_uses_ancestry_not_list_or_publication_order(self):
        release = release_object(Graph([(A, B)]))
        release.github.published(A)
        # Unique URLs are needed because two releases use the same file names.
        first = copy.deepcopy(release.github.files)
        release.github.published(B, A)
        for a in release.github.releases[0]["assets"]:
            old = a["url"]; a["url"] += "/first"; release.github.files[a["url"]] = first[old]
        self.assertEqual(release.checkpoint(), B)
        release.git = Graph()
        with self.assertRaisesRegex(r.ReleaseError, "divergent"):
            release.checkpoint()

    def test_preflight_no_heavy_job_when_unchanged_or_obsolete(self):
        with tempfile.TemporaryDirectory() as tmp:
            for state in ("same", "old", "new"):
                release = release_object(Graph([(A, B)]))
                release.sha = A if state != "new" else B
                release.checkpoint = lambda: A if state != "old" else B
                output = Path(tmp) / "child.yml"
                release.preflight(output)
                text = output.read_text()
                self.assertEqual("release.py run" in text, state == "new")
                self.assertIn('tags: [linux, shell, "plant01"]', text)


class WorkflowTests(GitRepo):
    def simulate(self, fail=None, hub=None):
        sha = self.git.run("rev-parse", "HEAD").stdout.strip()
        release = release_object(self.git)
        release.sha, release.tag = sha, "meet-" + sha
        release.github = hub or FakeHub()
        release.github.fail = fail
        calls = []
        def command(args, **kwargs):
            calls.append(args)
            if fail == "build" and args[:2] == ["docker", "build"]: raise r.ReleaseError("build failed")
            if fail == "smoke" and args[0] == "python3": raise r.ReleaseError("smoke failed")
            return types.SimpleNamespace(returncode=0, stdout=json.dumps([{"Os": "linux", "Architecture": "amd64", "Id": "sha256:" + "1" * 64}]))
        def mirror():
            if fail == "mirror": raise r.ReleaseError("mirror conflict")
            release.github.tags[release.tag] = sha
        release.command, release.mirror = command, mirror
        def save(image, path):
            if fail == "save": raise r.ReleaseError("save failed")
            path.write_bytes(b"synthetic docker save archive")
        release.save_image = save
        release.run()
        return release, calls

    def test_publish_once_and_unchanged_retry_does_no_build(self):
        self.commit("initial")
        release, calls = self.simulate()
        self.assertEqual(len(release.github.releases), 1)
        self.assertFalse(release.github.releases[0]["draft"])
        self.assertEqual(release.checkpoint(), release.sha)
        self.assertEqual(len(release.github.patch_payloads), 1)
        payload = release.github.patch_payloads[0]
        self.assertEqual(payload["tag_name"], release.tag)
        self.assertEqual(payload["target_commitish"], release.sha)
        self.assertIs(payload["draft"], False)
        self.assertIs(payload["prerelease"], False)
        self.assertEqual(payload["make_latest"], "true")
        self.assertIn("## Complete commit list", payload["body"])
        patch_index = next(i for i, event in enumerate(release.github.events) if event[0] == "PATCH")
        upload_indexes = [i for i, event in enumerate(release.github.events)
                          if event[0] == "POST" and event[1].startswith("https://uploads.github.com/")]
        self.assertEqual(len(upload_indexes), 4)
        self.assertGreater(patch_index, max(upload_indexes))
        # The last operations before publication re-read the owned draft and
        # its actual tag target. There is no intermediate metadata PATCH.
        self.assertEqual(release.github.events[patch_index - 2][0], "GET")
        self.assertIn("/releases/", release.github.events[patch_index - 2][1])
        self.assertIn("/git/ref/tags/", release.github.events[patch_index - 1][1])
        build = next(c for c in calls if c[:2] == ["docker", "build"])
        self.assertIn("linux/amd64", build)
        self.assertTrue(any(c[:2] == ["python3", "tests/container/smoke.py"] for c in calls))
        release.command = lambda *_a, **_kw: self.fail("unchanged retry must not invoke Docker")
        release.run()

    def test_failure_each_phase_keeps_checkpoint_and_retry_resumes(self):
        self.commit("initial")
        for phase in ("build", "smoke", "save", "mirror", "draft", "lost-draft-response", "upload", "lost-upload-response", "notes", "publish"):
            with self.subTest(phase=phase):
                hub = FakeHub()
                with self.assertRaises(r.ReleaseError): self.simulate(phase, hub)
                self.assertTrue(all(item["draft"] for item in hub.releases))
                release, _ = self.simulate(hub=hub)
                self.assertEqual(release.checkpoint(), release.sha)
                self.assertEqual(len(hub.releases), 1)

    def test_lost_publish_response_reconciles_verified_checkpoint(self):
        self.commit("initial")
        release, _ = self.simulate("lost-publish-response")
        self.assertEqual(release.checkpoint(), release.sha)
        self.assertEqual(len(release.github.patch_payloads), 1)
        self.assertEqual(release.github.releases[0]["tag_name"], release.tag)

    def test_api_fixture_reproduces_omitted_tag_patch_regression(self):
        release = release_object()
        draft = release.draft()
        release.github.request("PATCH", f"{release.prefix}/releases/{draft['id']}", {"body": "metadata only"})
        changed = release.github.get_release(draft["id"])
        self.assertEqual(changed["tag_name"], "untagged-test-placeholder")
        self.assertFalse(changed["draft"])

    def test_changed_draft_identity_or_tag_before_publication_stops_without_patch(self):
        self.commit("initial")
        for field in ("tag_name", "draft", "prerelease", "body", "tag_target"):
            with self.subTest(field=field):
                hub = FakeHub()
                def change(draft):
                    if field == "tag_target": hub.tags[draft["tag_name"]] = B
                    else: draft[field] = {"tag_name": "untagged-test-placeholder", "draft": False,
                                         "prerelease": True, "body": "foreign body"}[field]
                hub.before_publication = change
                with self.assertRaises(r.ReleaseError): self.simulate(hub=hub)
                self.assertFalse(hub.patch_payloads)

    def test_bad_creation_response_is_rejected_before_upload(self):
        release = release_object()
        request = release.github.request
        def invalid_response(method, path, *args, **kwargs):
            status, body, headers = request(method, path, *args, **kwargs)
            if method == "POST" and path.endswith("/releases"):
                body["tag_name"] = "untagged-test-placeholder"
            return status, body, headers
        release.github.request = invalid_response
        with self.assertRaisesRegex(r.ReleaseError, "expected.*tagged draft"):
            release.draft()
        self.assertFalse(release.github.files)

    def test_draft_upload_skips_matching_and_repairs_own_starter_only(self):
        release = release_object()
        release.github.tags[release.tag] = release.sha
        draft = release.draft()
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            for name, content in bundle().items(): (directory / name).write_bytes(content)
            release.upload(draft, directory)
            first = len([e for e in release.github.events if e[0] == "POST"])
            release.upload(draft, directory)
            self.assertEqual(first, len([e for e in release.github.events if e[0] == "POST"]))
            release.github.releases[0]["assets"][0]["state"] = "starter"
            release.upload(draft, directory)
            self.assertTrue(any(e[0] == "DELETE" for e in release.github.events))
            # A retry may rebuild an identical source with a different Docker
            # creation timestamp. Only its unpublished draft is replaceable.
            for name, content in bundle(archive=b"different rebuild timestamp").items():
                (directory / name).write_bytes(content)
            release.upload(draft, directory)
            self.assertEqual(release.github.files["asset/" + r.ARCHIVE], b"different rebuild timestamp")
            release.github.releases[0]["assets"].append({"name": "unrelated.txt"})
            with self.assertRaisesRegex(r.ReleaseError, "unexpected assets"):
                release.upload(draft, directory)

    def test_push_only_main_and_managed_tag_without_force(self):
        release = release_object()
        got = {}
        release.git = types.SimpleNamespace(run=lambda *a, **kw: got.update(args=a, env=kw["env"]))
        release.mirror()
        args = got["args"]
        self.assertEqual(args[-2:], (A + ":refs/heads/main", A + ":refs/tags/meet-" + A))
        self.assertIn("--atomic", args)
        self.assertFalse(any(x in args for x in ("--mirror", "--force", "--prune")))
        self.assertFalse(any(release.token in x for x in args))


class RegistryTests(unittest.TestCase):
    def registry_release(self, revision=A, source="https://github.com/owner/repo"):
        release = release_object()
        release.env.update(PUBLISH_GHCR="true", GHCR_TOKEN="not-a-real-package-token", GHCR_USERNAME="test-user")
        config = r.canonical({"config": {"Labels": {"org.opencontainers.image.revision": revision, "org.opencontainers.image.source": source}}})
        config_id = "sha256:" + r.digest(config)
        manifest_digest = "sha256:" + "9" * 64
        registry = types.SimpleNamespace(request=lambda method, path, **kw: (
            (200, config, {}) if "/blobs/" in path else
            (200, {"config": {"digest": config_id}}, {"Docker-Content-Digest": manifest_digest})
        ))
        release.registry = lambda: (registry, "v2/owner/repo/manifests/" + A, "ghcr.io/owner/repo:" + A)
        calls = []
        def command(args, **kwargs):
            calls.append((args, kwargs))
            return types.SimpleNamespace(stdout=json.dumps([{"Id": config_id}]), returncode=0)
        release.command = command
        return release, calls, config_id

    def test_existing_registry_image_is_reused_by_digest_not_rebuilt(self):
        release, calls, image_id = self.registry_release()
        with tempfile.TemporaryDirectory() as tmp:
            self.assertTrue(release.restore_ghcr("local:" + A, Path(tmp)))
            output = release.publish_ghcr("local:" + A, image_id, Path(tmp))
        self.assertEqual(output["digest"], "sha256:" + "9" * 64)
        self.assertTrue(any(args[:2] == ["docker", "pull"] and "@sha256:" in args[-1] for args, _ in calls))
        self.assertFalse(any(args[:2] == ["docker", "push"] for args, _ in calls))
        self.assertFalse(any("not-a-real-package-token" in str(args) for args, _ in calls))
        login = next(kwargs for args, kwargs in calls if args[:2] == ["docker", "login"])
        self.assertEqual(login["input"], "not-a-real-package-token\n")

    def test_foreign_or_wrong_revision_registry_tag_is_preserved(self):
        for revision, source in ((B, "https://github.com/owner/repo"), (A, "https://github.com/other/repo")):
            with self.subTest(revision=revision, source=source):
                release, calls, _ = self.registry_release(revision, source)
                with tempfile.TemporaryDirectory() as tmp:
                    with self.assertRaisesRegex(r.ReleaseError, "repository/revision"):
                        release.restore_ghcr("local:" + A, Path(tmp))
                self.assertEqual(calls, [])

    def test_registry_digest_conflict_never_pushes(self):
        release, calls, _ = self.registry_release()
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(r.ReleaseError, "refusing to overwrite"):
                release.publish_ghcr("local:" + A, "sha256:" + "8" * 64, Path(tmp))
        self.assertEqual(calls, [])

    def test_disabled_registry_does_not_request_credentials_or_service(self):
        release = release_object()
        release.registry = lambda: self.fail("disabled registry must not access service")
        with tempfile.TemporaryDirectory() as tmp:
            self.assertFalse(release.restore_ghcr("local:" + A, Path(tmp)))
            self.assertIsNone(release.publish_ghcr("local:" + A, "any", Path(tmp)))


if __name__ == "__main__":
    unittest.main()
