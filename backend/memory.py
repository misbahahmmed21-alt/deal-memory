import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any


_SCALAR_FIELDS = ("budget", "timeline", "decision_maker")
_LIST_FIELDS = ("pain_points", "competitors", "next_steps")
_MEMORY_FIELDS = {"type", "value", "source", "date"}
DEFAULT_DB_PATH = Path(__file__).with_name("memories.db")


def _create_memories_table(connection: sqlite3.Connection) -> None:
    connection.execute(
        """CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            value TEXT NOT NULL,
            source TEXT NOT NULL,
            date TEXT NOT NULL
        )"""
    )


def make_memories(
    extracted_json: dict[str, Any], source: str, date: str
) -> list[dict[str, str]]:
    """Convert extracted meeting details into individual memory items."""
    if not isinstance(extracted_json, dict):
        raise TypeError("extracted_json must be a dictionary")

    memories = []
    for field in _SCALAR_FIELDS:
        value = extracted_json.get(field)
        if value is None:
            continue
        if not isinstance(value, str):
            raise ValueError(f"{field} must be a string or null")
        memories.append({"type": field, "value": value, "source": source, "date": date})

    for field in _LIST_FIELDS:
        values = extracted_json.get(field)
        if values is None:
            continue
        if not isinstance(values, list) or not all(
            isinstance(value, str) for value in values
        ):
            raise ValueError(f"{field} must be a list of strings or null")
        memories.extend(
            {"type": field, "value": value, "source": source, "date": date}
            for value in values
        )

    return memories


def save_memories(
    memories: list[dict[str, str]], db_path: str | Path = DEFAULT_DB_PATH
) -> None:
    """Create the memories table if needed and insert memory items."""
    for memory in memories:
        if not isinstance(memory, dict) or set(memory) != _MEMORY_FIELDS:
            raise ValueError("Each memory must contain type, value, source, and date")
        if not all(isinstance(memory[field], str) for field in _MEMORY_FIELDS):
            raise ValueError("Memory fields must all be strings")

    with closing(sqlite3.connect(db_path)) as connection:
        _create_memories_table(connection)
        with connection:
            connection.executemany(
                "INSERT INTO memories (type, value, source, date) VALUES (?, ?, ?, ?)",
                [
                    (memory["type"], memory["value"], memory["source"], memory["date"])
                    for memory in memories
                ],
            )


def get_all_memories(
    db_path: str | Path = DEFAULT_DB_PATH,
) -> list[dict[str, Any]]:
    """Return all stored memory items in insertion order, including their IDs."""
    with closing(sqlite3.connect(db_path)) as connection:
        connection.row_factory = sqlite3.Row
        _create_memories_table(connection)
        rows = connection.execute(
            "SELECT id, type, value, source, date FROM memories ORDER BY id"
        ).fetchall()
    return [dict(row) for row in rows]