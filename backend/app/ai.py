from fastapi import APIRouter, Depends, HTTPException

from app.ai_client import AIConfigError, AIRequestError, DEFAULT_MODEL, complete
from app.auth import require_user

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/connectivity")
def connectivity_test(_username: str = Depends(require_user)) -> dict[str, str]:
    """Ask the configured model a simple arithmetic question to verify OpenRouter."""
    try:
        answer = complete(
            [
                {
                    "role": "user",
                    "content": "What is 2+2? Reply with only the number.",
                }
            ]
        )
    except AIConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except AIRequestError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {"model": DEFAULT_MODEL, "answer": answer}
