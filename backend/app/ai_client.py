import json
import os

import httpx

OPENAI_URL = "https://api.openai.com/v1/chat/completions"
DEFAULT_MODEL = "gpt-4o-mini"
FALLBACK_MODEL = "gpt-4o"


class AIConfigError(Exception):
    """Raised when OPENAI_API_KEY is missing."""


class AIRequestError(Exception):
    """Raised when the OpenAI request fails."""


def get_api_key() -> str:
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        raise AIConfigError("OPENAI_API_KEY is not set")
    return key


def complete(messages: list[dict[str, str]], *, model: str = DEFAULT_MODEL) -> str:
    """Send a chat completion request to OpenAI and return the assistant text."""
    payload = {"model": model, "messages": messages}
    data = _post_completion(payload)
    return _extract_message_content(data)


def _post_completion(payload: dict) -> dict:
    api_key = get_api_key()
    try:
        response = httpx.post(
            OPENAI_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=60.0,
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text.strip()
        raise AIRequestError(
            f"OpenAI request failed ({exc.response.status_code}): {detail}"
        ) from exc
    except httpx.HTTPError as exc:
        raise AIRequestError(f"OpenAI request failed: {exc}") from exc
    except ValueError as exc:
        raise AIRequestError("OpenAI returned invalid JSON") from exc


def _extract_message_content(data: dict) -> str:
    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise AIRequestError("OpenAI response missing message content") from exc

    if not isinstance(content, str) or not content.strip():
        raise AIRequestError("OpenAI returned an empty message")

    return content.strip()


def complete_structured(
    messages: list[dict[str, str]],
    schema: dict,
    *,
    model: str = DEFAULT_MODEL,
    schema_name: str = "response",
) -> dict:
    """Send a structured-output chat completion and return parsed JSON."""
    payload = {
        "model": model,
        "messages": messages,
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": schema_name,
                "strict": True,
                "schema": schema,
            },
        },
    }
    data = _post_completion(payload)
    content = _extract_message_content(data)
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as exc:
        raise AIRequestError("OpenAI returned invalid structured JSON") from exc
    if not isinstance(parsed, dict):
        raise AIRequestError("OpenAI structured output must be a JSON object")
    return parsed
