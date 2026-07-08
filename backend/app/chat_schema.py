def _nullable_string() -> dict:
    return {"anyOf": [{"type": "string"}, {"type": "null"}]}


def _nullable_integer() -> dict:
    return {"anyOf": [{"type": "integer"}, {"type": "null"}]}


# OpenAI strict json_schema rejects oneOf. Use one flat object per operation;
# unused fields are null. apply_operations validates by type at runtime.
OPERATION_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "type": {
            "type": "string",
            "enum": [
                "create_card",
                "edit_card",
                "delete_card",
                "move_card",
                "rename_column",
            ],
        },
        "column_id": _nullable_string(),
        "column_title": _nullable_string(),
        "title": _nullable_string(),
        "details": _nullable_string(),
        "card_id": _nullable_string(),
        "destination_column_id": _nullable_string(),
        "destination_column_title": _nullable_string(),
        "destination_index": _nullable_integer(),
    },
    "required": [
        "type",
        "column_id",
        "column_title",
        "title",
        "details",
        "card_id",
        "destination_column_id",
        "destination_column_title",
        "destination_index",
    ],
    "additionalProperties": False,
}

CHAT_RESPONSE_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "reply": {"type": "string", "description": "Assistant reply to the user"},
        "operations": {
            "type": "array",
            "description": "Board mutations to apply. Use an empty array when no changes are needed.",
            "items": OPERATION_SCHEMA,
        },
    },
    "required": ["reply", "operations"],
    "additionalProperties": False,
}

SYSTEM_PROMPT = """You are a helpful Kanban board assistant. The user manages a project board with fixed columns. You can create, edit, delete, and move cards, and rename columns.

The current board JSON lists columns with id, title, and cardIds. Cards are in the cards map keyed by id.

When the user asks you to change the board, you MUST include complete operations in the operations array. When only answering a question, return an empty operations array.

Each operation is one object with a type field. Set unused fields to null.

Every operation must include all required fields for its type:
- create_card: title (required), column_id or column_title (required), details (optional, else null)
- edit_card: card_id, title, details (null if unchanged)
- delete_card: card_id
- move_card: card_id, destination_index, destination_column_id or destination_column_title
- rename_column: title (new column name), column_id or column_title

Use column_id from the board JSON when possible (string numbers like "1", "2"). You may use column_title instead (e.g. "To Do").

Do not claim you changed the board unless the operations array contains the matching operations.

Keep replies concise and friendly."""
