import os

import httpx

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "openai/gpt-oss-120b"


class AIConfigError(Exception):
    """Raised when OPENROUTER_API_KEY is missing."""


class AIRequestError(Exception):
    """Raised when the OpenRouter request fails."""


def get_api_key() -> str:
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key:
        raise AIConfigError("OPENROUTER_API_KEY is not set")
    return key


def complete(messages: list[dict[str, str]], *, model: str = DEFAULT_MODEL) -> str:
    """Send a chat completion request to OpenRouter and return the assistant text."""
    api_key = get_api_key()
    payload = {"model": model, "messages": messages}

    try:
        response = httpx.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=60.0,
        )
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPError as exc:
        raise AIRequestError(f"OpenRouter request failed: {exc}") from exc
    except ValueError as exc:
        raise AIRequestError("OpenRouter returned invalid JSON") from exc

    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise AIRequestError("OpenRouter response missing message content") from exc

    if not isinstance(content, str) or not content.strip():
        raise AIRequestError("OpenRouter returned an empty message")

    return content.strip()
