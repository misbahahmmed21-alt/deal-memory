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


_SYSTEM_PROMPT = """
You are a sales intelligence extraction assistant.

Analyze the provided sales meeting transcript.

Return ONLY a valid JSON object.

The JSON object MUST contain exactly these keys:

budget
timeline
decision_maker
pain_points
competitors
next_steps

Data types:

- budget: string or null
- timeline: string or null
- decision_maker: string or null
- pain_points: array of strings or null
- competitors: array of strings or null
- next_steps: array of strings or null

IMPORTANT RULES:

1. Do not invent information.
2. Do not make assumptions.
3. Only extract information explicitly mentioned in the transcript.
4. If information is missing, return null.
5. Keep the extracted information concise.
6. Return valid JSON only.
7. Do not use markdown.
8. Do not include explanations outside the JSON object.
"""


def _parse_model_reply(raw_reply: Any) -> dict[str, Any]:
    """
    Parse and validate the model's JSON response.
    """

    if not isinstance(raw_reply, str):
        raise ValueError("OpenRouter returned an empty or invalid response.")

    response_text = raw_reply.strip()

    # Remove markdown code fences if the model accidentally adds them.
    response_text = re.sub(
        r"```(?:json)?",
        "",
        response_text,
        flags=re.IGNORECASE,
    )

    response_text = response_text.replace("```", "").strip()

    # Extract the JSON object if additional text was returned.
    start = response_text.find("{")
    end = response_text.rfind("}")

    if start >= 0 and end > start:
        response_text = response_text[start:end + 1]

    try:
        result = json.loads(response_text)

    except json.JSONDecodeError as error:
        print("\n========== OPENROUTER RAW RESPONSE ==========")
        print(raw_reply)
        print("==============================================\n")

        raise ValueError(
            "OpenRouter returned invalid JSON."
        ) from error

    # Make sure the response is an object.
    if not isinstance(result, dict):
        raise ValueError(
            "OpenRouter returned something other than a JSON object."
        )

    # Make sure all required fields exist.
    expected_fields = set(_FIELD_TYPES.keys())
    returned_fields = set(result.keys())

    if returned_fields != expected_fields:
        missing = expected_fields - returned_fields
        extra = returned_fields - expected_fields

        raise ValueError(
            f"Invalid fields returned by OpenRouter. "
            f"Missing: {missing}. Extra: {extra}."
        )

    # Validate every field.
    for field, expected_type in _FIELD_TYPES.items():

        value = result[field]

        # null is allowed.
        if value is None:
            continue

        # Check expected type.
        if not isinstance(value, expected_type):
            raise ValueError(
                f"Invalid value type for '{field}'. "
                f"Expected {expected_type.__name__}."
            )

        # Lists must contain only strings.
        if isinstance(value, list):

            if not all(isinstance(item, str) for item in value):
                raise ValueError(
                    f"Invalid value for '{field}'. "
                    "All list items must be strings."
                )

    return result


def extract_sales_meeting(transcript: str) -> dict[str, Any]:
    """
    Extract structured sales information from a meeting transcript
    using OpenRouter.
    """

    if not isinstance(transcript, str):
        raise TypeError("transcript must be a string.")

    if not transcript.strip():
        raise ValueError("Transcript cannot be empty.")

    client = get_openrouter_client()
    model = get_openrouter_model()

    request = {
        "model": model,
        "max_tokens": 1800,
        "temperature": 0,
        "messages": [
            {
                "role": "system",
                "content": _SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": transcript,
            },
        ],
    }

    # First try with JSON response formatting.
    try:

        json_request = {
            **request,
            "response_format": {
                "type": "json_object"
            },
        }

        response = client.chat.completions.create(
            **json_request
        )

    except BadRequestError:

        # Some OpenRouter models do not support response_format.
        # Retry without it.
        response = client.chat.completions.create(
            **request
        )

    # Make sure the API returned a choice.
    if not response.choices:
        raise ValueError(
            "OpenRouter returned no choices."
        )

    message = response.choices[0].message

    if message is None:
        raise ValueError(
            "OpenRouter returned an empty message."
        )

    content = message.content

    if not content:
        raise ValueError(
            "OpenRouter returned empty content."
        )

    return _parse_model_reply(content)