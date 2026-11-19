"""Read merged PRs and their pre-merge CI attempts from GitHub."""

from datetime import datetime, timedelta, timezone
import json
import subprocess
from urllib.parse import urlencode


def timestamp(text):
    value = datetime.fromisoformat(text.replace("Z", "+00:00"))
    if value.tzinfo is None:
        raise ValueError("Include the UTC offset in the rollout timestamp.")
    return value.astimezone(timezone.utc)


def gh(*args):
    return json.loads(subprocess.check_output(["gh", *args]))


def merges_on(day):
    fields = "number,createdAt,mergedAt,headRefName,headRepository,changedFiles"
    batch = gh("pr", "list", "--base", "main", "--state", "merged", "--search",
               f"merged:{day}", "--limit", "1000", "--json", fields)
    if len(batch) == 1000:
        raise ValueError(f"GitHub search reached its result limit on {day}.")
    return sorted(batch, key=lambda pr: (pr["mergedAt"], pr["number"]))


def first_merges(since, limit):
    day = since.date()
    today = datetime.now(timezone.utc).date()
    prs = []
    while day <= today and len(prs) < limit:
        prs.extend(filter(lambda pr: timestamp(pr["mergedAt"]) >= since, merges_on(day)))
        day += timedelta(days=1)
    return prs[:limit]


def matches_pr(run, pr):
    if run["created_at"] >= pr["mergedAt"]:
        return False
    return linked_pr(run, pr) if run["pull_requests"] else same_repository(run, pr)


def linked_pr(run, pr):
    return any(link["number"] == pr["number"] for link in run["pull_requests"])


def same_repository(run, pr):
    head = pr["headRepository"] or {}
    return head.get("id") == (run["head_repository"] or {}).get("node_id", "unknown")


def workflow_runs(pr):
    params = urlencode({"event": "pull_request", "branch": pr["headRefName"], "per_page": 100,
                        "created": f"{pr['createdAt']}..{pr['mergedAt']}"})
    pages = gh("api", "--paginate", "--slurp",
               f"repos/{{owner}}/{{repo}}/actions/workflows/ci.yml/runs?{params}")
    for page in pages:
        yield from filter(lambda run: matches_pr(run, pr), page["workflow_runs"])


def attempts(run):
    for number in range(1, run["run_attempt"]):
        yield gh("api", f"repos/{{owner}}/{{repo}}/actions/runs/{run['id']}/attempts/{number}")
    yield run


def failed_before(attempt, merged):
    return attempt["conclusion"] == "failure" and attempt["updated_at"] <= merged


def failures(run, merged):
    for attempt in attempts(run):
        if failed_before(attempt, merged):
            yield f"{run['html_url']}/attempts/{attempt['run_attempt']}"
