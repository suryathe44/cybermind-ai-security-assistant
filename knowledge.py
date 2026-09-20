"""Approved, local workshop knowledge. User input never becomes instructions."""

KNOWLEDGE = {
    "prompt injection": {
        "summary": "Untrusted text influences an AI application's instruction flow.",
        "example": "A document tells the assistant to ignore the intended task.",
        "mitigation": "Treat untrusted content as data and keep authorization outside the model.",
    },
    "rag poisoning": {
        "summary": "A retrieval system returns manipulated or unauthorized knowledge.",
        "example": "An unapproved document outranks the approved source.",
        "mitigation": "Use source governance, provenance and authorization filters.",
    },
    "mcp": {
        "summary": "MCP connects AI applications to tools, resources and prompts.",
        "example": "An AI discovers a read-only asset lookup tool through an MCP server.",
        "mitigation": "Use least privilege, allowlists, validation and logging.",
    },
}


def retrieve(topic: str):
    """Return only an entry from the approved local knowledge set."""
    return KNOWLEDGE.get(topic.casefold())
