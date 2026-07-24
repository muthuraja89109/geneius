import React, { useRef, useState } from "react";
import { resizeImageFile } from "../utils/resizeImage.js";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export default function ChatInput({ onSend, disabled, agentMode, onToggleAgentMode }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const handleFilePick = async (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    const finalFile = IMAGE_TYPES.includes(picked.type) ? await resizeImageFile(picked) : picked;
    setFile(finalFile);
    if (IMAGE_TYPES.includes(finalFile.type)) {
      setPreviewUrl(URL.createObjectURL(finalFile));
    } else {
      setPreviewUrl(null);
    }
  };

  const clearAttachment = () => {
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (disabled) return;
    if (!text.trim() && !file) return;

    onSend({ text: text.trim(), file, previewUrl });

    setText("");
    clearAttachment();
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const autoGrow = (e) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  return (
    <form className="chat-input-bar" onSubmit={handleSubmit}>
      {file && (
        <div className="pending-attachment">
          {previewUrl ? (
            <img src={previewUrl} alt={file.name} />
          ) : (
            <span className="file-chip">📄 {file.name}</span>
          )}
          <button type="button" className="remove-attachment" onClick={clearAttachment}>
            ✕
          </button>
        </div>
      )}

      <div className="input-row">
        <button
          type="button"
          className="attach-btn"
          title="Attach an image or document"
          onClick={() => fileInputRef.current?.click()}
        >
          📎
        </button>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.docx,.txt,.md,.csv,.json"
          onChange={handleFilePick}
        />

        <textarea
          ref={textareaRef}
          rows={1}
          placeholder={agentMode ? "Ask the agent — it can search, calculate…" : "Message Groq Chat…"}
          value={text}
          onChange={autoGrow}
          onKeyDown={handleKeyDown}
        />

        <button
          type="button"
          className={`agent-toggle ${agentMode ? "on" : ""}`}
          title="Toggle Agent Mode (web search, calculator, live time)"
          onClick={onToggleAgentMode}
        >
          🤖 Agent
        </button>

        <button
          type="submit"
          className="send-btn"
          disabled={disabled || (!text.trim() && !file)}
        >
          ➤
        </button>
      </div>
    </form>
  );
}
