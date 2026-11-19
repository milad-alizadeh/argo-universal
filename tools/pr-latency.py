"""Measure the first 100 local browser requests and merged PRs after rollout."""

import argparse
from datetime import datetime, timedelta, timezone
import json
import math
from pathlib import Path
import statistics
import subprocess
from urllib.parse import urlencode

LIMIT = 100


def timestamp(text):
    value = datetime.fromisoformat(text.replace("Z", "+00:00"))
    if value.tzinfo is None:
        raise ValueError("Include the UTC offset in the rollout timestamp.")
    return value.astimezone(timezone.utc)


def summary(label, values):
    if values:
        ordered = sorted(values)
        p90 = ordered[math.ceil(0.9 * len(values)) - 1]
        print(f"{label} ({len(values)}): median {statistics.median(values):.1f} min, p90 {p90:.1f} min")
    else:
        print(f"{label}: no observations yet")


def local(since):
    journal = Path.home() / ".cache/argo-browser-suite/47291.log"
    runs = {}
    cutoff = int(since.timestamp() * 1000)
    if journal.exists():
        with journal.open() as stream:
            for line in stream:
                parts = line.split()
                if len(parts) != 3 or not parts[0].isdigit():
                    continue
                when, token, event = parts
                if event == "request" and int(when) >= cutoff and len(runs) < LIMIT:
                    runs[token] = [int(when), None, None]
                if token in runs and event in ("acquire", "release"):
                    runs[token][1 if event == "acquire" else 2] = int(when)
    rows = list(runs.values())
    print(f"Local browser requests: {len(rows)}/100")
    summary("Wait until acquired", [(a-r)/60000 for r, a, _ in rows if a is not None])
    summary("Time held", [(f-a)/60000 for _, a, f in rows if a is not None and f is not None])
    print(f"Never acquired: {sum(a is None for _, a, _ in rows)}. Acquired without a recorded release: {sum(a is not None and f is None for _, a, f in rows)}.")


def gh(*args):
    return json.loads(subprocess.check_output(["gh", *args]))


def first_merges(since):
    day = since.date()
    today = datetime.now(timezone.utc).date()
    prs = []
    while len(prs) < LIMIT and day <= today:
        fields = "number,createdAt,mergedAt,headRefName,headRepository,changedFiles"
        batch = gh("pr", "list", "--base", "main", "--state", "merged", "--search",
                   f"merged:{day}", "--limit", "1000", "--json", fields)
        if len(batch) == 1000:
            raise ValueError(f"GitHub search reached its result limit on {day}.")
        prs.extend(sorted((p for p in batch if timestamp(p["mergedAt"]) >= since),
                          key=lambda p: (p["mergedAt"], p["number"])))
        day += timedelta(days=1)
    return prs[:LIMIT]


def remote(since):
    prs = first_merges(since)
    print(f"Merged PRs: {len(prs)}/100")
    summary("Open to merge", [(timestamp(p["mergedAt"]) - timestamp(p["createdAt"])).total_seconds()/60 for p in prs])
    if prs:
        print(f"Median files changed: {statistics.median(p['changedFiles'] for p in prs):g}")
    failures = []
    retries = 0
    for pr in prs:
        params = urlencode({"event": "pull_request", "branch": pr["headRefName"], "per_page": 100,
                            "created": f"{pr['createdAt']}..{pr['mergedAt']}"})
        pages = gh("api", "--paginate", "--slurp", f"repos/{{owner}}/{{repo}}/actions/workflows/ci.yml/runs?{params}")
        for page in pages:
            for run in page["workflow_runs"]:
                if run["created_at"] >= pr["mergedAt"]:
                    continue
                linked = run["pull_requests"]
                head = pr["headRepository"]
                if not linked and (not head or not run["head_repository"] or head["id"] != run["head_repository"]["node_id"]):
                    continue
                if linked and all(p["number"] != pr["number"] for p in linked):
                    continue
                if run["conclusion"] == "failure":
                    failures.append((pr["number"], run["html_url"]))
                if run["run_attempt"] > 1:
                    retries += 1
    print(f"PRs with an observed CI failure: {len(set(p for p, _ in failures))}. Workflows with multiple attempts: {retries}.")
    for pr, url in failures:
        print(f"#{pr} {url}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--since", type=timestamp, required=True, help="Rollout time, e.g. 2026-11-19T23:00:00Z")
    options = parser.parse_args()
    local(options.since)
    remote(options.since)
