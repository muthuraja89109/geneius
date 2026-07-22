"""
Tools the agent is allowed to call. Each tool is described with a JSON
schema (OpenAI/Groq "function calling" format) and has a matching Python
implementation in TOOL_IMPLS / execute_tool below.
"""

import ast
import operator
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# 1. Calculator — safe arithmetic only (no eval/exec, no arbitrary code)
# ---------------------------------------------------------------------------

_ALLOWED_BINOPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}
_ALLOWED_UNARYOPS = {
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


def _eval_node(node):
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED_BINOPS:
        return _ALLOWED_BINOPS[type(node.op)](_eval_node(node.left), _eval_node(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _ALLOWED_UNARYOPS:
        return _ALLOWED_UNARYOPS[type(node.op)](_eval_node(node.operand))
    raise ValueError("Only numbers and + - * / // % ** () are allowed")


def calculate(expression: str) -> str:
    try:
        tree = ast.parse(expression, mode="eval")
        return str(_eval_node(tree.body))
    except Exception as exc:  # noqa: BLE001
        return f"Error evaluating '{expression}': {exc}"


# ---------------------------------------------------------------------------
# 2. Web search — DuckDuckGo, no API key required
# ---------------------------------------------------------------------------


def web_search(query: str, max_results: int = 5) -> str:
    try:
        try:
            from ddgs import DDGS
        except ImportError:
            from duckduckgo_search import DDGS  # older package name

        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))

        if not results:
            return "No results found."

        lines = [
            f"- {r.get('title', '')}: {r.get('body', '')} ({r.get('href', '')})"
            for r in results
        ]
        return "\n".join(lines)
    except Exception as exc:  # noqa: BLE001
        return f"Search error: {exc}"


# ---------------------------------------------------------------------------
# 3. Current date/time (models don't otherwise know "now")
# ---------------------------------------------------------------------------


def get_current_datetime() -> str:
    return datetime.now(timezone.utc).strftime("%A, %Y-%m-%d %H:%M:%S UTC")


# ---------------------------------------------------------------------------
# Tool schema exposed to Groq + dispatcher
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "calculator",
            "description": "Evaluate an arithmetic expression. Use for any math the user asks for.",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "e.g. '(12 + 8) * 3 / 2'",
                    }
                },
                "required": ["expression"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": (
                "Search the live web. Use for current events, recent facts, prices, "
                "or anything that could have changed since the model's training."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "max_results": {
                        "type": "integer",
                        "description": "Number of results to return (default 5)",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_current_datetime",
            "description": "Get the current date and time (UTC).",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]


def execute_tool(name: str, arguments: dict) -> str:
    if name == "calculator":
        return calculate(arguments.get("expression", ""))
    if name == "web_search":
        return web_search(arguments.get("query", ""), arguments.get("max_results", 5))
    if name == "get_current_datetime":
        return get_current_datetime()
    return f"Unknown tool: {name}"
