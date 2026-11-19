"""Choose CI unit-test groups before allocating runners or installing dependencies."""

import json
import subprocess
import sys
from pathlib import Path

GROUPS = [
    {"group": "plugins", "filter": "--filter=./plugins/*", "playwright": "none"},
    {"group": "kits", "filter": "--filter=@argo/plugin-kit --filter=@repo/client", "playwright": "none"},
    {"group": "rest", "filter": "--filter=!@repo/engine --filter=!./plugins/* --filter=!@argo/plugin-kit --filter=!@repo/client", "playwright": "chromium"},
]


def select(base):
    if not base:
        return GROUPS
    paths = subprocess.check_output(
        ["git", "diff", "--no-renames", "--name-only", "-z", f"{base}...HEAD"]
    ).split(b"\0")
    changed = [Path(p.decode()) for p in paths if p]
    if not changed or any(
        p.parts[0] != "plugins" or len(p.parts) < 3 or p.name == "package.json"
        for p in changed
    ):
        return GROUPS

    tasks = json.loads(subprocess.check_output(
        ["turbo", "query", "affected", "--base", base, "--head", "HEAD", "--tasks", "test"]
    ))["data"]["affectedTasks"]["items"]
    plugins = {json.loads(p.read_text())["name"] for p in Path("plugins").glob("*/package.json")}
    if not all((Path(*p.parts[:2]) / "package.json").is_file() for p in changed):
        return GROUPS
    selected = {"plugins"}
    for task in tasks:
        if task["name"] != "test":
            continue
        package = task["package"]["name"]
        if package in {"@argo/plugin-kit", "@repo/client"}:
            selected.add("kits")
        elif package not in plugins and package != "@repo/engine":
            selected.add("rest")
    return [group for group in GROUPS if group["group"] in selected]


if __name__ == "__main__":
    try:
        groups = select(sys.argv[1])
    except (subprocess.CalledProcessError, OSError, ValueError, KeyError, TypeError) as error:
        print(f"Could not narrow unit tests, running every group: {error}", file=sys.stderr)
        groups = GROUPS
    print(json.dumps({"include": groups}, separators=(",", ":")))
