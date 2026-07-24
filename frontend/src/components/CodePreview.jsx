import React, { useState } from "react";
import JSZip from "jszip";
import { buildPreviewHtml } from "../utils/extractCodeFiles.js";

export default function CodePreview({ files }) {
  const [showPreview, setShowPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const previewHtml = buildPreviewHtml(files);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const zip = new JSZip();
      files.forEach((f) => zip.file(f.name, f.content));
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "website.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="code-preview-panel">
      <div className="code-preview-header">
        <span>
          📦 {files.length} file{files.length > 1 ? "s" : ""} generated
        </span>
        <div className="code-preview-actions">
          {previewHtml && (
            <button className="cp-btn" onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? "Hide preview" : "🖥️ Live preview"}
            </button>
          )}
          <button className="cp-btn primary" onClick={handleDownload} disabled={downloading}>
            {downloading ? "Zipping…" : "⬇️ Download ZIP"}
          </button>
        </div>
      </div>

      <div className="code-preview-filelist">
        {files.map((f) => (
          <span key={f.name} className="cp-file-chip">
            {f.name}
          </span>
        ))}
      </div>

      {showPreview && previewHtml && (
        <iframe
          className="code-preview-frame"
          srcDoc={previewHtml}
          sandbox="allow-scripts"
          title="Live preview"
        />
      )}
    </div>
  );
}