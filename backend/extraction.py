import json
import re
from typing import Any

from openai import BadRequestError

from llm import get_openrouter_client, get_openrouter_model
_FIELD_TYPES = {
    "budget": str,
    "timeline": str,
    "decision_maker": str,
    "pain_points": list,
    "competitors": list,
    "next_steps": list,
}

_SYSTEM_PROMPT = """Extract sales qualification details from the meeting transcript.
Return ONLY a valid JSON object. No explanation, no markdown.
The object must have exactly these keys: budget, timeline,
decision_maker, pain_points, competitors, next_steps.
Use a string for budget, timeline, and decision_maker. Use an array of strings
for pain_points, competitors, and next_steps. Use null for any value not
explicitly available in the transcript; do not infer missing information.
"""


def _parse_model_reply(raw_reply: Any) -> dict[str, Any]:
    response_text = raw_reply if isinstance(raw_reply, str) else ""
    response_text = re.sub(r"```(?:json)?", "", response_text, flags=re.IGNORECASE).strip()
    start = response_text.find("{")
    end = response_text.rfind("}")
    if start >= 0 and end > start:
        response_text = response_text[start : end + 1]

    try:
        result = json.loads(response_text)
    except json.JSONDecodeError as error:
        print(f"OpenRouter raw model reply:\n{raw_reply}")
        raise ValueError("OpenRouter returned invalid JSON.") from error

    if not isinstance(result, dict) or set(result) != set(_FIELD_TYPES):
        raise ValueError("OpenRouter returned an object with an invalid field set.")

    for field, expected_type in _FIELD_TYPES.items():
        value = result[field]
        if value is not None and not isinstance(value, expected_type):
            raise ValueError(f"OpenRouter returned an invalid value for {field}.")
        if isinstance(value, list) and not all(isinstance(item, str) for item in value):
            raise ValueError(f"OpenRouter returned an invalid value for {field}.")

    return result


def extract_sales_meeting(transcript: str) -> dict[str, Any]:
    """Extract structured sales details from a transcript using OpenRouter."""
    if not isinstance(transcript, str):
        raise TypeError("transcript must be a string")

    client = get_openrouter_client()
    request = {
        "model": get_openrouter_model(),
        "max_tokens": 1800,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": transcript},
        ],
    }
    try:
        response = client.chat.completions.create(**request)
    except BadRequestError:
        request.pop("response_format")
        response = client.chat.completions.create(**request)

    return _parse_model_reply(response.choices[0].message.content)