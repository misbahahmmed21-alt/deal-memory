import os
from openai import OpenAI


OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

DEFAULT_MODEL = "openai/gpt-4o-mini"


def get_openrouter_client() -> OpenAI:
    """
    Create and return an OpenRouter client.
    """

    api_key = os.getenv("OPENROUTER_API_KEY")

    if not api_key:
        raise RuntimeError(
            "OPENROUTER_API_KEY is not set. "
            "Set it in PowerShell before starting the backend."
        )

    return OpenAI(
        api_key=api_key,
        base_url=OPENROUTER_BASE_URL,
        default_headers={
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "Deal Intelligence Agent",
        },
    )


def get_openrouter_model() -> str:
    """
    Get the OpenRouter model from the environment.
    Falls back to a default model if none is specified.
    """

    return os.getenv(
        "OPENROUTER_MODEL",
        DEFAULT_MODEL,
    )