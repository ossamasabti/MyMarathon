"""Bibliography helpers: DOI normalization, citation keys, BibTeX export, goal indicator sync.

Kept free of DRF so they can be tested directly.
"""

from __future__ import annotations

import re
import unicodedata
from decimal import Decimal
from typing import Iterable

from .models import Goal, ReadingStatus, Reference, ReferenceKind

DOI_PREFIX = re.compile(r"^(?:https?://(?:dx\.)?doi\.org/|doi:\s*)", re.IGNORECASE)
# Short words skipped when picking the title word of a citation key.
STOP_WORDS = {
    "a", "an", "the", "of", "on", "in", "for", "and", "to", "with", "by", "from", "at", "as",
    "le", "la", "les", "un", "une", "des", "de", "du", "et", "en", "pour", "sur", "au", "aux",
}
ARTICLE_UNITS = {"article", "articles"}

BIBTEX_TYPES = {
    ReferenceKind.ARTICLE: ("article", "journal"),
    ReferenceKind.CONFERENCE: ("inproceedings", "booktitle"),
    ReferenceKind.BOOK: ("book", "publisher"),
    ReferenceKind.THESIS: ("phdthesis", "school"),
    ReferenceKind.PREPRINT: ("misc", "howpublished"),
    ReferenceKind.OTHER: ("misc", "howpublished"),
}
LATEX_SPECIALS = {
    "\\": r"\textbackslash{}",
    "{": r"\{",
    "}": r"\}",
    "&": r"\&",
    "%": r"\%",
    "$": r"\$",
    "#": r"\#",
    "_": r"\_",
    "~": r"\textasciitilde{}",
    "^": r"\textasciicircum{}",
}


def normalize_doi(value: str) -> str:
    """'https://doi.org/10.1007/BF00994018' -> '10.1007/bf00994018' (DOIs are case-insensitive)."""
    return DOI_PREFIX.sub("", value.strip()).strip().lower()


def ascii_word(text: str) -> str:
    """Lowercase ASCII letters and digits only ('Vapník' -> 'vapnik')."""
    decomposed = unicodedata.normalize("NFKD", text)
    return re.sub(r"[^a-z0-9]", "", decomposed.encode("ascii", "ignore").decode().lower())


def split_authors(authors: str) -> list[str]:
    return [a.strip() for a in authors.split(";") if a.strip()]


def first_author_last_name(authors: str) -> str:
    names = split_authors(authors)
    if not names:
        return ""
    first = names[0]
    # "Last, First" or "First Last".
    return first.split(",")[0] if "," in first else first.split()[-1]


def make_citation_key(authors: str, year: int | None, title: str, taken: Iterable[str]) -> str:
    """'vapnik1995support', then 'vapnik1995supportb', 'vapnik1995supportc'… when taken."""
    words = [ascii_word(w) for w in title.split()]
    title_word = next((w for w in words if w and w not in STOP_WORDS), "")
    base = f"{ascii_word(first_author_last_name(authors)) or 'ref'}{year or ''}{title_word}"[:70]
    taken = set(taken)
    if base not in taken:
        return base
    for suffix in "bcdefghijklmnopqrstuvwxyz":
        if base + suffix not in taken:
            return base + suffix
    index = 2
    while f"{base}{index}" in taken:
        index += 1
    return f"{base}{index}"


def latex_escape(text: str) -> str:
    return "".join(LATEX_SPECIALS.get(char, char) for char in text)


def to_bibtex(references: Iterable[Reference]) -> str:
    entries = []
    for ref in references:
        entry_type, venue_field = BIBTEX_TYPES[ref.kind]
        fields = [
            ("title", f"{{{latex_escape(ref.title)}}}"),  # double braces keep the title's capitals
            ("author", latex_escape(" and ".join(split_authors(ref.authors)))),
            ("year", str(ref.year) if ref.year else ""),
            (venue_field, latex_escape(ref.venue)),
            ("doi", ref.doi),
            ("url", ref.url),
            ("keywords", latex_escape(", ".join(ref.tags))),
        ]
        body = ",\n".join(f"  {name} = {{{value}}}" for name, value in fields if value)
        entries.append(f"@{entry_type}{{{ref.citation_key},\n{body}\n}}")
    return "\n\n".join(entries) + ("\n" if entries else "")


def sync_goal_indicator(goal: Goal | None) -> None:
    """A goal counted in articles (with a target) tracks how many linked references are read."""
    if goal is None or goal.target_value is None or goal.unit.strip().lower() not in ARTICLE_UNITS:
        return
    read = Reference.objects.filter(goal=goal, status=ReadingStatus.READ).count()
    if goal.current_value != Decimal(read):
        goal.current_value = Decimal(read)
        goal.save(update_fields=["current_value", "updated_at"])
