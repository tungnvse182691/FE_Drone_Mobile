"""Fail closed on canonical/snapshot drift or unreviewed lock change. Stdlib only."""
from pathlib import Path
import hashlib, json, sys

def check(root):
    lock_path = root / '09_Frontend/contracts/contract.lock.json'
    try:
        lock = json.loads(lock_path.read_text(encoding='utf-8'))
        canonical = root / '05_Technical/openapi.yaml'
        snapshot = root / '09_Frontend/contracts/openapi.baseline.yaml'
        a = hashlib.sha256(canonical.read_bytes()).hexdigest()
        b = hashlib.sha256(snapshot.read_bytes()).hexdigest()
        if a != b:
            raise ValueError('CONTRACT_DRIFT: canonical YAML != FE snapshot')
        if a != lock['sha256']:
            raise ValueError('CONTRACT_LOCK_MISMATCH: update lock only after contract review')
        return a
    except (OSError, ValueError, KeyError) as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)

if __name__ == '__main__':
    root = Path(__file__).resolve().parents[2]
    print('CONTRACT_HASH_PASS ' + check(root))
