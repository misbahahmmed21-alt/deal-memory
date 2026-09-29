import json
import re
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any

from llm import get_openrouter_client, get_openrouter_model
from memory import DEFAULT_DB_PATH


_TYPE_HINTS = {
    "budget": {"budget", "price", "pricing", "cost"},
    "timeline": {"timeline", "deadline", "launch", "schedule"},
    "decision_maker": {"decision", "approver", "signer", "sign"},
    "pain_points": {"pain", "problem", "problems", "challenge", "challenges"},
    "competitors": {"competitor", "competitors", "alternative", "alternatives", "vendor"},
    "next_steps": {"next", "step", "steps", "action", "actions", "followup"},
}
_STOP_WORDS = {
    "about", "after", "before", "did", "from", "have", "last", "meetings",
    "meeting", "question", "said", "say", "they", "them", "their", "what",
    "when", "where", "which", "who", "with",
}


def _terms(text: str) -> list[str]:
    return list(
        dict.fromkeys(
            term
            for term in re.findall(r"[a-z0-9]+", text.casefold())
            if len(term) > 2 and term not in _STOP_WORDS
        )
    )


def get_relevant_memories(
    query: str,
    memory_type: str | None = None,
    keyword: str | None = None,
    db_path: str | Path = DEFAULT_DB_PATH,
    exclude_source: str | None = None,
) -> list[dict[str, Any]]:
    """Find stored memories by explicit filters or terms in the query."""
    if not isinstance(query, str) or not query.strip():
        raise ValueError("query must be a non-empty string")
    if memory_type is not None and not isinstance(memory_type, str):
        raise TypeError("memory_type must be a string or None")
    if keyword is not None and not isinstance(keyword, str):
        raise TypeError("keyword must be a string or None")
    if exclude_source is not None and not isinstance(exclude_source, str):
        raise TypeError("exclude_source must be a string or None")

    query_terms = set(_terms(query))
    matching_types = (
        [memory_type]
        if memory_type
        else [
            field
            for field, hints in _TYPE_HINTS.items()
            if query_terms.intersection(hints)
        ]
    )
    search_terms = _terms(keyword) if keyword is not None else (
        [] if matching_types else _terms(query)
    )

    conditions = []
    parameters: list[str] = []
    if matching_types:
        placeholders = ", ".join("?" for _ in matching_types)
        conditions.append(f"type IN ({placeholders})")
        parameters.extend(matching_types)
    if search_terms:
        term_conditions = []
        for term in search_terms:
            term_conditions.append(
                "(LOWER(value) LIKE ? OR LOWER(source) LIKE ? OR LOWER(type) LIKE ?)"
            )
            pattern = f"%{term}%"
            parameters.extend((pattern, pattern, pattern))
        conditions.append(f"({' OR '.join(term_conditions)})")
    if exclude_source:
        conditions.append("LOWER(source) != LOWER(?)")
        parameters.append(exclude_source)

    sql = "SELECT id, type, value, source, date FROM memories"
    if conditions:
        sql += " WHERE " + " AND ".join(conditions)
    sql += " ORDER BY id DESC"

    with closing(sqlite3.connect(db_path)) as connection:
        connection.row_factory = sqlite3.Row
        connection.execute(
            """CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                value TEXT NOT NULL,
                source TEXT NOT NULL,
                date TEXT NOT NULL
            )"""
        )
        rows = connection.execute(sql, parameters).fetchall()

        refers_to_previous_meeting = bool(
            re.search(r"\b(last time|previous(?: meeting)?|earlier|prior)\b", query.casefold())
        )
        if refers_to_previous_meeting and not matching_types and keyword is None:
            source_sql = "SELECT source FROM memories"
            source_parameters: tuple[str, ...] = ()
            if exclude_source:
                source_sql += " WHERE LOWER(source) != LOWER(?)"
                source_parameters = (exclude_source,)
            source_row = connection.execute(
                f"{source_sql} ORDER BY id DESC LIMIT 1", source_parameters
            ).fetchone()
            if source_row:
                rows = connection.execute(
                    "SELECT id, type, value, source, date FROM memories "
                    "WHERE LOWER(source) = LOWER(?) ORDER BY id DESC",
                    (source_row["source"],),
                ).fetchall()
    return [dict(row) for row in rows]


def answer_with_memories(
    query: str,
    memory_type: str | None = None,
    keyword: str | None = None,
    db_path: str | Path = DEFAULT_DB_PATH,
    exclude_source: str | None = None,
) -> str:
    """Answer a question using relevant details from earlier meetings."""
    memories = get_relevant_memories(query, memory_type, keyword, db_path, exclude_source)
    if not memories:
        return "I couldn't find relevant details in the saved meeting memories."

    client = get_openrouter_client()
    response = client.chat.completions.create(
        model=get_openrouter_model(),
        max_tokens=1024,
        messages=[
            {
                "role": "system",
                "content": (
                    "Answer using only the supplied saved meeting memories. Do not invent "
                    "details. If they do not contain the answer, say so. When useful, "
                    "identify the meeting source and date."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Question or new transcript:\n{query}\n\n"
                    "Relevant earlier meeting memories:\n"
                    f"{json.dumps(memories, indent=2)}"
                ),
            },
        ],
    )
    answer = response.choices[0].message.content
    if not isinstance(answer, str):
        raise ValueError("OpenRouter returned an empty response.")
    return answer.strip()