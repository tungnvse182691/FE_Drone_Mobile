"""RoadGuard V2 alignment guards. UTF-8, read-only, no runtime/database calls."""
from pathlib import Path
import hashlib
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[4]
PLANNING = ROOT / "planning/V2"
MANIFEST_PATH = PLANNING / "task_manifest.json"
OPENAPI = ROOT / "docs/diagram/V2/05_Technical/openapi.yaml"
REG = PLANNING / "V2-3_DECISION_REGISTER.md"
LIFECYCLE = PLANNING / "TASK_LIFECYCLE.md"


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    tasks = manifest["tasks"]
    assert len(tasks) == 133, len(tasks)
    assert len({task["id"] for task in tasks}) == 133
    assert len({task["op"] for task in tasks}) == 133
    owners = {owner: sum(task["owner"] == owner for task in tasks) for owner in (1, 2)}
    assert owners == {1: 71, 2: 62}, owners
    assert REG.is_file() and LIFECYCLE.is_file()
    canonical_hash = hashlib.sha256(OPENAPI.read_bytes()).hexdigest()
    assert manifest["source_sha256"] == canonical_hash
    for task in tasks:
        path = PLANNING / task["file"]
        assert path.is_file(), task["file"]
        text = path.read_text(encoding="utf-8")
        for marker in ("deliveryStatus:", "Source evidence", "sourceCheckpoint:"):
            assert marker in text, f"{task['id']} missing {marker}"
        assert task.get("requirementRefs"), task["id"]
        assert task.get("diagramRefs"), task["id"]
        assert task.get("deliveryStatus") in {"TODO", "IN_PROGRESS", "PARTIAL", "BLOCKED", "DONE"}, task["id"]
    print(json.dumps({
        "status": "ALIGNMENT_GUARDS_PASS",
        "tasks": len(tasks),
        "owners": owners,
        "sourceSha256": canonical_hash,
        "runtimeChecks": "NOT_RUN",
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, OSError, json.JSONDecodeError) as error:
        print(f"ALIGNMENT_GUARDS_FAIL: {error}", file=sys.stderr)
        raise SystemExit(1)
