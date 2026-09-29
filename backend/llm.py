import os

from openai import OpenAI


OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_OPENROUTER_MODEL = "anthropic/claude-sonnet-4.5"


def get_openrouter_client() -> OpenAI:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError(
            "OPENROUTER_API_KEY is not set. Set the OPENROUTER_API_KEY "
            "environment variable before using the AI features."
        )
    return OpenAI(api_key=api_key, base_url=OPENROUTER_BASE_URL)


def get_openrouter_model() -> str:
    return os.environ.get("OPENROUTER_MODEL", DEFAULT_OPENROUTER_MODEL)