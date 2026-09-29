import json
import os
from pathlib import Path

from extraction import extract_sales_meeting


def main() -> None:
    if not os.environ.get("OPENROUTER_API_KEY"):
        raise SystemExit(
            "Error: set OPENROUTER_API_KEY before running the extraction test."
        )
    transcript_path = Path(__file__).with_name("sample_transcript.txt")
    transcript = transcript_path.read_text(encoding="utf-8")
    result = extract_sales_meeting(transcript)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()