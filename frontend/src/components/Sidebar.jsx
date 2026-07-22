import React from "react";

export default function Sidebar({ chats, activeChatId, onNewChat, onSelectChat, onDeleteChat, model }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">◆</span>
        <span className="brand-name">Groq Chat</span>
      </div>

      <button className="new-chat-btn" onClick={onNewChat}>
        + New chat
      </button>

      <div className="chat-history">
        <div className="chat-history-label">Recent</div>
        {chats.length === 0 && <p className="hint">No conversations yet.</p>}
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`chat-history-item ${chat.id === activeChatId ? "active" : ""}`}
            onClick={() => onSelectChat(chat.id)}
          >
            <span className="chat-history-title">{chat.title || "New chat"}</span>
            <button
              className="chat-delete-btn"
              title="Delete chat"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChat(chat.id);
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="model-pill">
          <span className="dot" />
          {model || "connecting…"}
        </div>
        <p className="hint">
          Attach an image for visual Q&amp;A, or a PDF / DOCX / TXT for document
          Q&amp;A. Toggle <b>🤖 Agent</b> below the message box to let it search
          the web, do math, or check the time.
        </p>
      </div>
    </aside>
  );
}