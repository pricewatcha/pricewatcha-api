#!/usr/bin/env python3
"""Fail if any OpenAPI query parameter lacks a description.

Zero-dependency (no PyYAML): walks parameter blocks in openapi/openapi.yaml.
The GitHub contract is this file; live GET /openapi.json lives in price_tracker.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

SPEC = Path(__file__).resolve().parent.parent / "openapi" / "openapi.yaml"

_PATH_RE = re.compile(r"^  (/[^:]+):")
_METHOD_RE = re.compile(r"^    (get|post|put|patch|delete):")
_PARAM_NAME_RE = re.compile(r"^        - name: (\S+)")
_IN_QUERY_RE = re.compile(r"^          in: query\s*$")
_DESC_RE = re.compile(r"^          description:")
_NEXT_PARAM_OR_RESP = re.compile(r"^        - name: |^      responses:")


def main() -> int:
    lines = SPEC.read_text(encoding="utf-8").splitlines()
    path = method = name = None
    in_param = False
    is_query = False
    has_desc = False
    missing: list[str] = []

    def flush() -> None:
        nonlocal in_param, is_query, has_desc, name
        if in_param and is_query and not has_desc:
            missing.append(f"{(method or '?').upper()} {path} query param `{name}`")
        in_param = is_query = has_desc = False
        name = None

    for line in lines:
        path_m = _PATH_RE.match(line)
        if path_m:
            flush()
            path = path_m.group(1)
            method = None
            continue
        method_m = _METHOD_RE.match(line)
        if method_m:
            flush()
            method = method_m.group(1)
            continue
        param_m = _PARAM_NAME_RE.match(line)
        if param_m:
            flush()
            in_param = True
            name = param_m.group(1)
            continue
        if in_param and _NEXT_PARAM_OR_RESP.match(line):
            flush()
            if line.startswith("        - name:"):
                in_param = True
                name = _PARAM_NAME_RE.match(line).group(1)  # type: ignore[union-attr]
            continue
        if in_param and _IN_QUERY_RE.match(line):
            is_query = True
        if in_param and _DESC_RE.match(line):
            has_desc = True
    flush()

    if missing:
        print("Query parameters missing description in openapi/openapi.yaml:", file=sys.stderr)
        for row in missing:
            print(f"  - {row}", file=sys.stderr)
        return 1
    print("All OpenAPI query parameters have descriptions")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
