"""
diagnose.py - find out why the XPT files will not read
=======================================================

    python diagnose.py

Prints, for the five DEMO files: size, the first bytes, and the FULL error
from pandas. One of these will be obvious:

  * starts with "HEADER RECORD" -> real XPT, so it is a pandas problem
  * starts with "<!DOCTYPE" or "<html" -> CDC served an error page
  * starts with \\x1f\\x8b -> gzipped, needs decompressing first
"""

import glob
import os
import sys
import traceback

import pandas as pd

print(f"pandas {pd.__version__}   python {sys.version.split()[0]}\n")

files = sorted(glob.glob(os.path.join("nhanes_raw", "*DEMO*.XPT")))
if not files:
    files = sorted(glob.glob(os.path.join("nhanes_raw", "*.XPT")))[:5]
if not files:
    sys.exit("No files in nhanes_raw/ . Run --download first.")

for path in files:
    size = os.path.getsize(path)
    with open(path, "rb") as f:
        head = f.read(80)

    print("=" * 70)
    print(f"{os.path.basename(path)}   {size:,} bytes")

    if head[:2] == b"\x1f\x8b":
        kind = "GZIP (needs decompressing)"
    elif head.lstrip()[:1] == b"<":
        kind = "HTML (CDC served an error page, not data)"
    elif b"HEADER RECORD" in head:
        kind = "valid XPT"
    else:
        kind = "unknown"
    print(f"looks like: {kind}")
    print(f"first bytes: {head[:60]!r}")

    for label, kwargs in [("format='xport'", {"format": "xport"}),
                          ("no format arg", {})]:
        try:
            df = pd.read_sas(path, **kwargs)
            print(f"  OK   read_sas({label}) -> {df.shape[0]} rows, "
                  f"{df.shape[1]} cols")
            print(f"       columns: {list(df.columns)[:8]}")
            break
        except Exception:
            print(f"  FAIL read_sas({label}):")
            for line in traceback.format_exc().strip().splitlines()[-2:]:
                print(f"       {line.strip()}")

    print()
