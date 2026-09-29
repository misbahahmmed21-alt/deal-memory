import json
import os
import tempfile
from pathlib import Path

from extraction import extract_sales_meeting
from memory import make_memories, save_memories
from retrieval import answer_with_memories


BACKEND_DIR = Path(__file__).resolve().parent
QUESTION = "What did we learn last time?"


def process_meeting(
    transcript_path: Path,
    source: str,
    meeting_date: str,
    db_path: Path,
) -> None:
    transcript = transcript_path.read_text(encoding="utf-8")
    extracted = extract_sales_meeting(transcript)
    memories = make_memories(extracted, source, meeting_date)
    save_memories(memories, db_path)

    print(f"\n{source} extracted facts")
    print(json.dumps(extracted, indent=2))
    print(f"Saved {len(memories)} memories from {source}.")


def main() -> None:
    if not os.environ.get("OPENROUTER_API_KEY"):
        raise SystemExit(
            "Error: set OPENROUTER_API_KEY before running the demo."
        )

    meeting_1_source = "Meeting 1 - Northstar discovery"
    meeting_2_source = "Meeting 2 - Northstar follow-up"

    with tempfile.TemporaryDirectory(prefix="deal-memory-demo-") as temp_dir:
        db_path = Path(temp_dir) / "memories.db"
        process_meeting(
            BACKEND_DIR / "sample_transcript_1.txt",
            meeting_1_source,
            "2026-09-20",
            db_path,
        )
        process_meeting(
            BACKEND_DIR / "sample_transcript_2.txt",
            meeting_2_source,
            "2026-09-28",
            db_path,
        )

        print(f"\nQuestion: {QUESTION}")
        answer = answer_with_memories(
            QUESTION,
            db_path=db_path,
            exclude_source=meeting_2_source,
        )
        print(f"OpenRouter answer from earlier meeting memories:\n{answer}")


if __name__ == "__main__":
    main()