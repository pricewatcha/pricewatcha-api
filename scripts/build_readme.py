#!/usr/bin/env python3
"""Assemble README.md from docs/ (single source of truth)."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"

API_BASE = "https://pricewatcha.com/api/v1"
SITE_BASE = "https://pricewatcha.com"
MCP_URL = "https://mcp.pricewatcha.com"
GITHUB_REPO = "https://github.com/pricewatcha/pricewatcha-api"

README_SECTIONS: list[Path] = [
    DOCS / "fragments" / "readme-intro.md",
    DOCS / "getting-started.md",
    DOCS / "authentication.md",
    DOCS / "fragments" / "api-keys-browser.md",
    DOCS / "headless-bootstrap.md",
    DOCS / "fragments" / "endpoints.md",
    DOCS / "rate-limits.md",
    DOCS / "async-workflows.md",
    DOCS / "search.md",
    DOCS / "privacy-and-data.md",
    DOCS / "errors.md",
    DOCS / "alerts.md",
    DOCS / "webhooks.md",
    DOCS / "integrations" / "mcp.md",
    DOCS / "integrations" / "claude.md",
    DOCS / "integrations" / "chatgpt.md",
    DOCS / "integrations" / "n8n.md",
    DOCS / "integrations" / "make.md",
    DOCS / "integrations" / "smart-home.md",
    DOCS / "integrations" / "home-assistant.md",
    DOCS / "integrations" / "loxone.md",
    DOCS / "sdks.md",
    DOCS / "changelog.md",
    DOCS / "fragments" / "repo.md",
    DOCS / "fragments" / "legal.md",
    DOCS / "support.md",
]

_OFFICIAL_FOOTER = re.compile(
    r"\n---\n+\*\*Official documentation \(full guides\):\*\*[^\n]*\n?",
    re.IGNORECASE,
)
_HTML_COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)
_LABEL_SPAN = re.compile(
    r'<span class="developers-label[^"]*">[^<]*</span>\s*',
    re.IGNORECASE,
)
_CALLOUT_DIV = re.compile(
    r'<div class="developers-callout developers-callout--(\w+)">\s*(.*?)\s*</div>',
    re.DOTALL | re.IGNORECASE,
)
_HEADING_ANCHOR = re.compile(r" \{#[^}]+\}")


def _substitute(text: str) -> str:
    text = (
        text.replace("{{API_BASE}}", API_BASE)
        .replace("{{SITE_BASE}}", SITE_BASE)
        .replace("{{MCP_URL}}", MCP_URL)
        .replace("{{GITHUB_REPO}}", GITHUB_REPO)
    )
    # README uses canonical host without www
    text = text.replace("https://www.pricewatcha.com", SITE_BASE)
    text = text.replace("http://www.pricewatcha.com", SITE_BASE)
    return text


def _callout_to_blockquote(match: re.Match[str]) -> str:
    kind = match.group(1).lower()
    body = match.group(2).strip()
    prefix = {"info": "Note", "warning": "Warning"}.get(kind, "Note")
    return f"> **{prefix}:** {body}\n\n"


def _prepare_chunk(raw: str, *, demote_headings: bool) -> str:
    text = _OFFICIAL_FOOTER.sub("\n", raw)
    text = _HTML_COMMENT.sub("", text)
    text = _LABEL_SPAN.sub("", text)
    text = _CALLOUT_DIV.sub(_callout_to_blockquote, text)
    text = _HEADING_ANCHOR.sub("", text)
    if demote_headings:

        def demote_line(line: str) -> str:
            m = re.match(r"^(#{1,6})(\s)", line)
            if not m:
                return line
            level = len(m.group(1))
            if level >= 6:
                return line
            return "#" * (level + 1) + line[level:]

        text = "\n".join(demote_line(ln) for ln in text.splitlines())
    return text.strip()


def build_readme() -> str:
    parts: list[str] = []
    for i, path in enumerate(README_SECTIONS):
        if not path.is_file():
            raise FileNotFoundError(f"Missing doc section: {path}")
        raw = path.read_text(encoding="utf-8")
        chunk = _prepare_chunk(raw, demote_headings=(i > 0))
        parts.append(_substitute(chunk))
    body = "\n\n---\n\n".join(parts)
    return body.rstrip() + "\n"


def main() -> int:
    out = ROOT / "README.md"
    content = build_readme()
    if len(sys.argv) > 1 and sys.argv[1] == "--check":
        existing = out.read_text(encoding="utf-8") if out.is_file() else ""
        if existing != content:
            print("README.md is out of date. Run: python scripts/build_readme.py", file=sys.stderr)
            return 1
        print("README.md is up to date")
        return 0
    out.write_text(content, encoding="utf-8")
    print(f"Wrote {out} ({len(content.splitlines())} lines)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
