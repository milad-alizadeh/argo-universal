"""Measure the first 100 local browser requests and merged PRs after rollout."""

import argparse
from itertools import repeat
import math
from pathlib import Path
import statistics

from pr_latency_journal import sample_requests
from pr_latency_github import failures, first_merges, timestamp, workflow_runs

LIMIT = 100
MINUTE_MS = 60_000


def summary(label, values):
    ordered = sorted(values)
    if not ordered:
        print(f"{label}: no observations yet")
        return
    p90 = ordered[math.ceil(0.9 * len(ordered)) - 1]
    print(f"{label} ({len(ordered)}): median {statistics.median(ordered):.1f} min, p90 {p90:.1f} min")


def local_rows(since):
    journal = Path.home() / ".cache/argo-browser-suite/47291.log"
    if not journal.exists():
        return []
    with journal.open() as stream:
        return sample_requests(stream, int(since.timestamp() * 1000), LIMIT)


def wait_observations(rows):
    return [(r.outstanding, (r.started - r.requested) / MINUTE_MS) for r in rows if r.started is not None]


def complete(row):
    return row.started is not None and row.finished is not None


def local(since):
    rows = local_rows(since)
    waits = wait_observations(rows)
    holds = [(r.finished - r.started) / MINUTE_MS for r in filter(complete, rows)]
    print(f"Local browser requests: {len(rows)}/{LIMIT}")
    cohort_report("Wait until acquired", waits, QUEUE_BANDS)
    summary("Time held", holds)
    print(f"Never acquired: {len(rows) - len(waits)}. Acquired without recorded release: {len(waits) - len(holds)}.")


def band(low, high):
    if low == high:
        return str(low)
    return f"{low}+" if high == math.inf else f"{low}–{high}"


QUEUE_BANDS = [(low, high, f"{band(low, high)} outstanding") for low, high in ((0, 0), (1, 1), (2, 3), (4, math.inf))]
SIZE_BANDS = [(low, high, f"{band(low, high)} files") for low, high in ((0, 4), (5, 15), (16, math.inf))]


def cohort_values(observations, low, high):
    return [duration for size, duration in observations if low <= size <= high]


def cohort_report(label, observations, bands):
    summary(label, (duration for _, duration in observations))
    for low, high, name in bands:
        summary(f"{label} ({name})", cohort_values(observations, low, high))


def merge_observation(pr):
    elapsed = timestamp(pr["mergedAt"]) - timestamp(pr["createdAt"])
    return pr["changedFiles"], elapsed.total_seconds()/60


def ci_results(prs):
    failed = []
    retries = 0
    for pr in prs:
        for run in workflow_runs(pr):
            retries += int(run["run_attempt"] > 1)
            failed.extend(zip(repeat(pr["number"]), failures(run, pr["mergedAt"])))
    return failed, retries


def remote(since):
    prs = first_merges(since, LIMIT)
    print(f"Merged PRs: {len(prs)}/{LIMIT}")
    cohort_report("Open to merge", list(map(merge_observation, prs)), SIZE_BANDS)
    failed, retries = ci_results(prs)
    print(f"PRs with a failed CI attempt: {len(set(p for p, _ in failed))}. Workflows with multiple attempts: {retries}.")
    for pr, url in failed:
        print(f"#{pr} {url}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--since", type=timestamp, required=True, help="UTC rollout time")
    options = parser.parse_args()
    local(options.since)
    remote(options.since)
