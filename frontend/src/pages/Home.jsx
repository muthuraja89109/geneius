import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { resizeImageFile } from "../utils/resizeImage.js";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const goToChatWithFile = async (file) => {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setError("Please drop an image file (PNG, JPG, WEBP, or GIF).");
      return;
    }
    setError("");
    const finalFile = await resizeImageFile(file);
    const previewUrl = URL.createObjectURL(finalFile);
    navigate("/chat", {
      state: {
        pendingFile: finalFile,
        pendingPreviewUrl: previewUrl,
        pendingText: "Here's a screenshot of a website — take a look and tell me about it.",
      },
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    goToChatWithFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    goToChatWithFile(file);
  };

  return (
    <div className="home-shell">
      <div className="home-brand">
        <span className="brand-mark">◆</span>
        <span className="brand-name">Groq Chat</span>
      </div>

      <div className="home-center">
        <h1>Drag and drop a screenshot of any website</h1>
        <p className="home-subtitle">We'll take a look and start a conversation about it.</p>

        <div
          className={`dropzone ${isDragging ? "dragging" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div className="dropzone-icon">🖼️</div>
          <div className="dropzone-text">
            Drop an image here, or <span className="dropzone-link">click to browse</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept=".png,.jpg,.jpeg,.webp,.gif"
            onChange={handleFilePick}
          />
        </div>

        {error && <p className="dropzone-error">{error}</p>}

        <button className="skip-to-chat" onClick={() => navigate("/chat")}>
          Or just start typing →
        </button>
      </div>
    </div>
  );
}