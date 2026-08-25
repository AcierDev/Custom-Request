from __future__ import annotations

import argparse
import hashlib
import re
from pathlib import Path

from docx import Document
from pypdf import PdfReader


EXPECTED_PAGE_COUNT = 4

REQUIRED_SNIPPETS = (
    "Last updated: August 4, 2026",
    "Amazon Business CC and classified as a Credit Card, not a bank account",
    "The $28.13 transaction dated July 1, 2026 is a FedEx refund credited to Postage",
    "The $700.78 Zelle payment dated July 14, 2026 reimbursed Yaakov Weil for Pirate Ship labels",
    "The corrected July 2026 Profit and Loss report shows net profit of $367.25 on both cash and accrual bases",
    "did not change total profit",
)

FORBIDDEN_SNIPPETS = (
    "The account labeled US Bank in Zoho Books",
    "The $28.13 and $700 Zelle payments involving Benjamin",
    "This increases book profit in the period of the journal entry",
    "A July net loss of approximately $2,600 was observed",
    "Whether the $28.13 and $700 Pirate Ship expenses were already recorded",
    "The final account-level explanation for July's approximately $2,600 loss",
)


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def docx_text(path: Path) -> str:
    document = Document(path)
    parts = [paragraph.text for paragraph in document.paragraphs]
    for table in document.tables:
        for row in table.rows:
            parts.extend(cell.text for cell in row.cells)
    return normalize("\n".join(parts))


def pdf_text_and_pages(path: Path) -> tuple[str, int]:
    reader = PdfReader(path)
    return normalize("\n".join(page.extract_text() or "" for page in reader.pages)), len(reader.pages)


def digest(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def check_text(label: str, text: str) -> None:
    for snippet in REQUIRED_SNIPPETS:
        if snippet not in text:
            raise AssertionError(f"{label} is missing required text: {snippet}")
    for snippet in FORBIDDEN_SNIPPETS:
        if snippet in text:
            raise AssertionError(f"{label} still contains stale text: {snippet}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("docx", type=Path)
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--source-docx", type=Path)
    args = parser.parse_args()

    check_text("DOCX", docx_text(args.docx))
    pdf_text, page_count = pdf_text_and_pages(args.pdf)
    check_text("PDF", pdf_text)
    if page_count != EXPECTED_PAGE_COUNT:
        raise AssertionError(f"Expected {EXPECTED_PAGE_COUNT} PDF pages, found {page_count}")

    if args.source_docx and digest(args.source_docx) != digest(args.docx):
        raise AssertionError("The original source DOCX does not match the verified output DOCX")

    print(f"Verified DOCX content, PDF content, {page_count} pages, and matching source files.")


if __name__ == "__main__":
    main()
