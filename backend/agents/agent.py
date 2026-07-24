"""
A minimal ReAct-style tool-calling loop for Groq's OpenAI-compatible API.

run_agent() sends the conversation to Groq with `tools` attached. If the
model requests a tool call, we execute it locally and feed the result back,
repeating until the model returns a plain text answer (or MAX_ITERATIONS
is hit).
"""

import json

from .tools import TOOLS, execute_tool

MAX_ITERATIONS = 5


def run_agent(client, model: str, messages: list) -> dict:
    """
    Returns:
        {
          "reply": str,
          "tool_calls": [{"name": str, "arguments": dict, "result": str}, ...]
        }
    """
    trace = []
    working_messages = list(messages)

    for _ in range(MAX_ITERATIONS):
        completion = client.chat.completions.create(
            model=model,
            messages=working_messages,
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.4,
            max_tokens=4096,
        )
        msg = completion.choices[0].message

        if not msg.tool_calls:
            return {"reply": msg.content or "", "tool_calls": trace}

        working_messages.append(
            {
                "role": "assistant",
                "content": msg.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in msg.tool_calls
                ],
            }
        )

        for tc in msg.tool_calls:
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}

            result = execute_tool(tc.function.name, args)
            trace.append({"name": tc.function.name, "arguments": args, "result": result})

            working_messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "name": tc.function.name,
                    "content": result,
                }
            )

    return {
        "reply": "I made several tool calls but couldn't reach a final answer — try rephrasing your question.",
        "tool_calls": trace,
    }
