import os
from unittest.mock import patch

import pytest

from app.ai_client import AIConfigError, AIRequestError, complete


def test_complete_raises_when_api_key_missing(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    with pytest.raises(AIConfigError, match="OPENROUTER_API_KEY"):
        complete([{"role": "user", "content": "hi"}])


def test_complete_returns_assistant_message(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": [{"message": {"content": " 4 "}}]}

    with patch("app.ai_client.httpx.post", return_value=FakeResponse()) as post:
        answer = complete([{"role": "user", "content": "What is 2+2?"}])

    assert answer == "4"
    post.assert_called_once()
    _, kwargs = post.call_args
    assert kwargs["headers"]["Authorization"] == "Bearer test-key"
    assert kwargs["json"]["model"] == "openai/gpt-oss-120b"


def test_complete_raises_on_http_error(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    import httpx

    with patch(
        "app.ai_client.httpx.post",
        side_effect=httpx.HTTPError("network down"),
    ):
        with pytest.raises(AIRequestError, match="OpenRouter request failed"):
            complete([{"role": "user", "content": "hi"}])


def test_connectivity_endpoint_requires_auth(raw_client, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    assert raw_client.post("/api/ai/connectivity").status_code == 401


def test_connectivity_endpoint_returns_answer(client, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    with patch("app.ai.complete", return_value="4"):
        res = client.post("/api/ai/connectivity")

    assert res.status_code == 200
    body = res.json()
    assert body["model"] == "openai/gpt-oss-120b"
    assert body["answer"] == "4"


def test_connectivity_endpoint_missing_key(client, monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    res = client.post("/api/ai/connectivity")
    assert res.status_code == 503
    assert "OPENROUTER_API_KEY" in res.json()["detail"]


def test_connectivity_endpoint_openrouter_error(client, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    with patch("app.ai.complete", side_effect=AIRequestError("upstream failed")):
        res = client.post("/api/ai/connectivity")

    assert res.status_code == 502
    assert res.json()["detail"] == "upstream failed"


@pytest.mark.skipif(
    not os.environ.get("OPENROUTER_API_KEY"),
    reason="OPENROUTER_API_KEY not set; live OpenRouter test skipped",
)
def test_live_openrouter_connectivity(client):
    res = client.post("/api/ai/connectivity")
    assert res.status_code == 200
    assert "4" in res.json()["answer"]
