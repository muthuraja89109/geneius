import React, { useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import ChatMessage from "./components/ChatMessage.jsx";
import ChatInput from "./components/ChatInput.jsx";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const STORAGE_KEY = "groq-chat-history";

const makeId = () => `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const emptyChat = () => ({ id: makeId(), title: "", messages: [], createdAt: Date.now() });

function loadChats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [chats, setChats] = useState(() => {
    const saved = loadChats();
    return saved.length > 0 ? saved : [emptyChat()];
  });
  const [activeChatId, setActiveChatId] = useState(() => chats[0].id);
  const [sending, setSending] = useState(false);
  const [model, setModel] = useState("");
  const [agentMode, setAgentMode] = useState(false);
  const scrollRef = useRef(null);

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0];
  const messages = activeChat ? activeChat.messages : [];

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((r) => r.json())
      .then((d) => setModel(d.text_model))
      .catch(() => setModel("offline"));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // Persist chats to localStorage whenever they change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } catch {
      // storage full or unavailable — ignore
    }
  }, [chats]);

  const updateChat = (chatId, updater) => {
    setChats((prev) => prev.map((c) => (c.id === chatId ? updater(c) : c)));
  };

  const handleNewChat = () => {
    const fresh = emptyChat();
    setChats((prev) => [fresh, ...prev]);
    setActiveChatId(fresh.id);
  };

  const handleSelectChat = (id) => setActiveChatId(id);

  const handleDeleteChat = (id) => {
    setChats((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (id === activeChatId) {
        if (next.length > 0) {
          setActiveChatId(next[0].id);
        } else {
          const fresh = emptyChat();
          setActiveChatId(fresh.id);
          return [fresh];
        }
      }
      return next;
    });
  };

  const buildHistoryPayload = (msgs) =>
    msgs.map((m) => ({
      role: m.role,
      content:
        m.attachment && m.attachment.kind === "image"
          ? `${m.content} [an image was attached to this message]`
          : m.content,
    }));

  const handleSend = async ({ text, file, previewUrl }) => {
    const chatId = activeChatId;
    const attachment = file
      ? {
          name: file.name,
          kind: IMAGE_TYPES.includes(file.type) ? "image" : "document",
          previewUrl,
        }
      : null;

    const userMsg = { role: "user", content: text, attachment };
    const historyPayload = buildHistoryPayload(messages);

    updateChat(chatId, (c) => {
      const nextMessages = [...c.messages, userMsg, { role: "assistant", content: "", pending: true }];
      const title = c.title || (text ? text.slice(0, 42) : file ? file.name : "New chat");
      return { ...c, messages: nextMessages, title };
    });

    setSending(true);

    try {
      const form = new FormData();
      form.append("message", text);
      form.append("history", JSON.stringify(historyPayload));
      form.append("agent_mode", agentMode ? "true" : "false");
      if (file) form.append("file", file);

      const res = await fetch(`${API_BASE}/chat`, { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Request failed");

      updateChat(chatId, (c) => {
        const next = [...c.messages];
        next[next.length - 1] = { role: "assistant", content: data.reply, toolCalls: data.tool_calls || [] };
        return { ...c, messages: next };
      });
      if (data.model) setModel(data.model);
    } catch (err) {
      updateChat(chatId, (c) => {
        const next = [...c.messages];
        next[next.length - 1] = {
          role: "assistant",
          content: `⚠️ ${err.message || "Something went wrong talking to the server."}`,
        };
        return { ...c, messages: next };
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        model={model}
      />

      <main className="chat-main">
        <div className="chat-scroll" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="empty-state">
              <h1>Groq Chat</h1>
              <p>Ask anything, or attach an image / document to ask about it.</p>
            </div>
          ) : (
            messages.map((m, i) => <ChatMessage key={i} {...m} />)
          )}
        </div>

        <ChatInput
          onSend={handleSend}
          disabled={sending}
          agentMode={agentMode}
          onToggleAgentMode={() => setAgentMode((v) => !v)}
        />
      </main>
    </div>
  );
}