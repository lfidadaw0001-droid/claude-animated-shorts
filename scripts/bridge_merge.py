#!/usr/bin/env python3
"""Merge the five look-match sandboxes into src/videos/bigben/ (and src/videos/bridge/).

Usage:
    python3 scripts/bridge_merge.py            # dry-run: show what would copy
    python3 scripts/bridge_merge.py --apply    # copy owned files + sync sandboxes
"""
import argparse, hashlib, pathlib, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DST = ROOT / "src/videos/bigben"

OWNERS: dict[str, list[str]] = {
    "cam":   ["story.ts"],
    "world": ["world.ts", "lights.ts", "shade.ts", "grade.ts"],
    "mat":   ["paint.ts", "build.ts"],
    "char":  ["toon.ts", "cast.ts", "cardshade.ts"],
    "post":  ["ink.ts", "Bridge.tsx", "lensblur.ts"],
}


def sha(p: pathlib.Path) -> str:
    return hashlib.sha1(p.read_bytes()).hexdigest()[:10] if p.exists() else "missing"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--only", choices=list(OWNERS))
    args = ap.parse_args()

    seen: dict[str, str] = {}
    for s, files in OWNERS.items():
        for f in files:
            assert f not in seen, f"{f} owned by both {seen[f]} and {s}"
            seen[f] = s

    DST.mkdir(parents=True, exist_ok=True)
    agents = [args.only] if args.only else list(OWNERS)
    copies: list[tuple[pathlib.Path, pathlib.Path, str]] = []
    for s in agents:
        sdir = ROOT / f"src/videos/bigben_{s}"
        for f in OWNERS[s]:
            src, dst = sdir / f, DST / f
            if not src.exists():
                continue
            status = "same" if sha(src) == sha(dst) else ("NEW" if not dst.exists() else "CHANGED")
            print(f"  [{s:5s}] {f:16s}  {sha(src)} -> {sha(dst)}  {status}")
            if status != "same":
                copies.append((src, dst, f"{s}:{f}"))

    if not args.apply:
        print(f"\n{len(copies)} file(s) differ. Re-run with --apply to copy.")
        return

    for src, dst, tag in copies:
        shutil.copy2(src, dst)
        print(f"  copied {tag}")

    # Sync merged baseline back into each sandbox so every sandbox compiles cleanly
    for s in OWNERS:
        sdir = ROOT / f"src/videos/bigben_{s}"
        for f in DST.iterdir():
            if f.is_file():
                shutil.copy2(f, sdir / f.name)

    # Also create BigBen.tsx re-export in DST and sandboxes
    for d in [DST, *[ROOT / f"src/videos/bigben_{s}" for s in OWNERS]]:
        (d / "BigBen.tsx").write_text('export { BridgeShort, BigBenShort, BRIDGE_FRAMES, BIGBEN_FRAMES } from "./Bridge";\nexport { default } from "./Bridge";\n')

    r = subprocess.run(["npx", "tsc", "--noEmit"], cwd=ROOT, capture_output=True, text=True)
    if r.returncode:
        print("\nTypeScript errors after merge:\n" + r.stdout + r.stderr)
        sys.exit(1)
    print("  tsc --noEmit: clean")


if __name__ == "__main__":
    main()
