#!/usr/bin/env python3
"""Write out/bigben/shots.json from src/videos/bigben/story.ts for short_qa.py."""
import json, pathlib, re, sys

src = open(sys.argv[1] if len(sys.argv) > 1 else "src/videos/bigben/story.ts", encoding="utf-8").read()
total_m = re.search(r"TOTAL\s*=\s*(\d+)", src)
total = int(total_m.group(1)) if total_m else 2025

shots = [
    {"id": int(i), "a": int(a), "b": int(total if b == "TOTAL" else b)}
    for i, a, b in re.findall(r"\{\s*id:\s*(\d+),\s*a:\s*(\d+),\s*b:\s*(\d+|TOTAL)", src)
]
xf = {
    int(k): int(v)
    for k, v in re.findall(r"(\d+):\s*(\d+)", re.search(r"XFADE[^{]*\{([^}]*)\}", src).group(1))
}
xfade = [[s["a"] - xf[s["id"]] // 2, s["a"] + xf[s["id"]] // 2] for s in shots if s["id"] in xf]
flash = int(re.search(r"FLASH_AT\s*=\s*(\d+)", src).group(1))
cuts = [[int(f), int(f)] for f in re.findall(r"\{\s*f:\s*(\d+),\s*cut:\s*true", src)]

consts = {k: float(v) for k, v in re.findall(r"export const (\w+)\s*=\s*([\d.]+)", src)}
hits_m = re.search(r"export const HITS\s*=\s*\[([^\]]+)\]", src)
if hits_m:
    for idx, val in enumerate(re.findall(r"[\d.]+", hits_m.group(1))):
        consts[f"HITS[{idx}]"] = float(val)

kicks_m = re.search(r"const KICKS[^=]*=\s*\[([\s\S]*?)\];", src)
kicks = []
if kicks_m:
    for t_tok in re.findall(r"\[\s*([A-Za-z0-9_\[\].]+)\s*,", kicks_m.group(1)):
        t_val = consts.get(t_tok)
        if t_val is None:
            try:
                t_val = float(t_tok)
            except ValueError:
                continue
        f0 = int(t_val * 30 + 1e-6)
        kicks.append([max(0, f0 - 1), f0 + 7])

out_data = {"shots": shots, "xfade": xfade, "flash": [flash, flash + 4], "planned": cuts + kicks}
for p in ["out/bigben/shots.json", "out/bridge/shots.json"]:
    pathlib.Path(p).parent.mkdir(parents=True, exist_ok=True)
    json.dump(out_data, open(p, "w"), indent=1)
print(f"{len(shots)} shots, xfade={xfade}, flash={flash}, cuts={[c[0] for c in cuts]}, kicks={kicks}")
