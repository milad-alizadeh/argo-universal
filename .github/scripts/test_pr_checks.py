"""Regression tests for CI selection and rollout measurements."""

import contextlib
from datetime import datetime, timezone
import importlib.util
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
import pr_latency_github as github


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


matrix = load("unit_matrix", ".github/scripts/unit-matrix.py")
latency = load("pr_latency", "tools/pr-latency.py")


def select(items):
    payload = json.dumps({"data": {"affectedTasks": {"items": items}}})
    with patch.object(matrix, "plugin_only", return_value=True), patch.object(matrix.subprocess, "check_output", return_value=payload):
        return matrix.select("base")


class SelectionTests(unittest.TestCase):
    def test_invalid_collection_or_record_keeps_every_group(self):
        for bad in [{}, "", None, [{"name": "test"}], [{"name": 12, "package": {"name": "cli"}}]]:
            with self.subTest(items=bad), contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(select(bad), matrix.GROUPS)

    def test_cli_fixture_consumer_selects_rest(self):
        groups = select([{"name": "test", "package": {"name": "@repo/cli"}}])
        self.assertEqual([g["group"] for g in groups], ["plugins", "rest"])

    def test_desktop_unit_group_provisions_chromium(self):
        groups = select([{"name": "test", "package": {"name": "@repo/desktop"}}])
        self.assertEqual([(g["group"], g["playwright"]) for g in groups],
                         [("plugins", "none"), ("rest", "chromium")])

    def test_cli_task_hash_tracks_files_read_by_the_shipped_plugin_fixture(self):
        turbo = shutil.which("turbo") or ROOT / "node_modules/.bin/turbo"
        command = [turbo, "run", "test", "--filter=@repo/cli", "--dry=json"]
        graph = json.loads(subprocess.check_output(command, cwd=ROOT))
        task = next(task for task in graph["tasks"] if task["taskId"] == "@repo/cli#test")
        for fixture in ["instructions.md", "plugin.json"]:
            self.assertIn(f"../../plugins/issue-tracker/{fixture}", task["inputs"])

    def test_no_base_keeps_all_groups(self):
        self.assertEqual(matrix.select(""), matrix.GROUPS)


class ReportTests(unittest.TestCase):
    def test_first_hundred_waits_include_preexisting_demand(self):
        lines = ["0 old request", "1 old acquire"]
        lines.extend(f"{n} row{n} request" for n in range(2, 103))
        lines.extend(["103 old release", "104 row2 acquire", "105 row2 release"])
        rows = latency.sample_requests(lines, 2, 100)
        self.assertEqual((len(rows), rows[-1].requested), (100, 101))
        self.assertEqual((rows[0].outstanding, rows[0].started, rows[0].finished), (1, 104, 105))

    def test_departed_waiter_leaves_arrival_cohort(self):
        rows = latency.sample_requests(["0 a request", "1 a gone", "2 b request"], 0, 100)
        self.assertEqual(rows[1].outstanding, 0)

    def test_success_after_failure_retains_failed_attempt_link(self):
        run = {"id": 42, "html_url": "url", "run_attempt": 2, "conclusion": "success"}
        first = {"run_attempt": 1, "conclusion": "failure", "updated_at": "2026-11-17T12:00:00Z"}
        with patch.object(github, "gh", return_value=first) as read:
            self.assertEqual(list(github.failures(run, "2026-11-17T13:00:00Z")), ["url/attempts/1"])
        read.assert_called_once_with("api", "repos/{owner}/{repo}/actions/runs/42/attempts/1")

    def test_cohorts_include_both_band_edges(self):
        values = [(0, 10), (4, 20), (5, 30), (15, 40), (16, 50)]
        for band, expected in zip(latency.SIZE_BANDS, ([10, 20], [30, 40], [50])):
            self.assertEqual(latency.cohort_values(values, *band[:2]), expected)
        loads = [(n, n) for n in range(5)]
        for band, expected in zip(latency.QUEUE_BANDS, ([0], [1], [2, 3], [4])):
            self.assertEqual(latency.cohort_values(loads, *band[:2]), expected)

    def test_pr_cutoff_applies_after_sorting_by_merge_time(self):
        since = datetime(2026, 11, 17, tzinfo=timezone.utc)
        batch = [{"number": n, "mergedAt": "2026-11-17T12:00:00Z"} for n in range(101, 0, -1)]
        with patch.object(github, "gh", return_value=batch):
            rows = github.first_merges(since, 100)
        self.assertEqual([row["number"] for row in rows], list(range(1, 101)))
