"""Choose CI unit-test groups before allocating runners or installing dependencies."""

import json
import subprocess
import sys
from pathlib import Path

KITS = ("@argo/plugin-kit", "@repo/client")
PLUGIN_FILTER = "./plugins/*"
ENGINE = "@repo/engine"


def group(name, filters, browser="none"):
    return {"group": name, "filter": " ".join(f"--filter={f}" for f in filters), "playwright": browser}


GROUPS = [
    group("plugins", [PLUGIN_FILTER]),
    group("kits", KITS),
    # The desktop CSP test's Chromium is installed by the workflow only when that test runs.
    group("rest", [f"!{p}" for p in (ENGINE, PLUGIN_FILTER, *KITS)]),
]


def isolated_plugin(path):
    if path.parts[:1] != ("plugins",):
        return False
    return len(path.parts) >= 3 and plugin_source(path)


def plugin_source(path):
    return path.name != "package.json" and (Path(*path.parts[:2]) / "package.json").is_file()


def plugin_only(base):
    diff = subprocess.check_output(["git", "diff", "--no-renames", "--name-only", "-z", f"{base}...HEAD"])
    paths = [Path(p.decode()) for p in diff.rstrip(b"\0").split(b"\0")]
    return all(map(isolated_plugin, paths))


def task_record(task):
    match task:
        case {"name": str(name), "package": {"name": str(package)}} if name and package:
            return name, package
    raise ValueError("Invalid affected task record")


def affected_tests(base):
    output = subprocess.check_output(["turbo", "query", "affected", "--base", base, "--head", "HEAD", "--tasks", "test"])
    items = json.loads(output)["data"]["affectedTasks"]["items"]
    if not isinstance(items, list):
        raise ValueError("Expected an affected task list")
    return test_packages(map(task_record, items))


def test_packages(tasks):
    return {package for name, package in tasks if name == "test"}


def shipped_plugins():
    return {json.loads(p.read_text())["name"] for p in Path("plugins").glob("*/package.json")}


def selected_groups(affected):
    plugins = shipped_plugins()
    selected = {"plugins"}
    if affected.intersection(KITS):
        selected.add("kits")
    if affected.difference(plugins, KITS, {ENGINE}):
        selected.add("rest")
    return selected


def matrix_for(base):
    names = selected_groups(affected_tests(base))
    return [group for group in GROUPS if group["group"] in names]


def choose_for_diff(base):
    return matrix_for(base) if plugin_only(base) else GROUPS


def select(base):
    if not base:
        return GROUPS
    try:
        return choose_for_diff(base)
    except (subprocess.CalledProcessError, OSError, ValueError, KeyError, TypeError) as error:
        print(f"Could not narrow unit tests, running every group: {error}", file=sys.stderr)
    return GROUPS


if __name__ == "__main__":
    print(json.dumps({"include": select(sys.argv[1])}, separators=(",", ":")))
