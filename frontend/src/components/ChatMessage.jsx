import React, { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function ChatMessage({ role, content, attachment, pending, toolCalls }) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null); // "up" | "down" | null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — fail silently
    }
  };

  const toggleFeedback = (value) => {
    setFeedback((prev) => (prev === value ? null : value));
  };

  return (
    <div className={`msg-row ${isUser ? "user" : "assistant"}`}>
      <div className="avatar">{isUser ? "You" : "AI"}</div>
      <div className="msg-col">
        <div className="msg-bubble">
          {attachment && (
            <div className="attachment-chip">
              {attachment.kind === "image" ? (
                <img src={attachment.previewUrl} alt={attachment.name} />
              ) : (
                <span className="file-chip">📄 {attachment.name}</span>
              )}
            </div>
          )}

          {toolCalls && toolCalls.length > 0 && (
            <div className="tool-trace">
              {toolCalls.map((tc, i) => (
                <div className="tool-call-chip" key={i}>
                  🔧 <b>{tc.name}</b>
                  {tc.arguments && Object.keys(tc.arguments).length > 0
                    ? ` (${Object.values(tc.arguments).join(", ")})`
                    : ""}
                </div>
              ))}
            </div>
          )}

          {pending ? (
            <div className="typing">
              <span />
              <span />
              <span />
            </div>
          ) : (
            <div className="markdown">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        {!pending && content && (
          <div className="msg-actions">
            <button className="msg-action-btn" title="Copy" onClick={handleCopy}>
              {copied ? "✅ Copied" : "📋 Copy"}
            </button>
            {!isUser && (
              <>
                <button
                  className={`msg-action-btn ${feedback === "up" ? "active" : ""}`}
                  title="Good response"
                  onClick={() => toggleFeedback("up")}
                >
                  👍
                </button>
                <button
                  className={`msg-action-btn ${feedback === "down" ? "active" : ""}`}
                  title="Bad response"
                  onClick={() => toggleFeedback("down")}
                >
                  👎
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}