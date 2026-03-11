import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

const API_SERVER = "https://clinical-trials-backend-pkak.onrender.com/";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  onGeoJsonUpdate: (geojson: any) => void;
}

export default function ChatPanel({ onGeoJsonUpdate }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      content:
        'Hi! I can help you find clinical cancer trials near you in Canada. Try: **"Find breast cancer trials near Toronto"**',
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = messageListRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_SERVER}/api/chat`, {
        message: text,
      });
      const data = response.data;

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.reply,
        },
      ]);

      if (data.geojson) {
        onGeoJsonUpdate(data.geojson);
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "Sorry, I had trouble connecting to the server. Is the backend running?",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Simple markdown-like bold renderer
  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
      {/* Message list */}
      <div
        ref={messageListRef}
        className="flex-grow overflow-y-auto p-4 space-y-3"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
              m.role === "user"
                ? "bg-blue-600 text-white self-end ml-auto rounded-br-sm"
                : "bg-white border border-gray-200 shadow-sm self-start rounded-bl-sm"
            }`}
          >
            {renderContent(m.content)}
          </div>
        ))}
        {loading && (
          <div className="bg-white border border-gray-200 shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm max-w-[85%] text-sm text-gray-500">
            <span className="animate-pulse">Searching trials...</span>
          </div>
        )}
      </div>
      <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
        <input
          className="flex-grow px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. lung cancer trials near Vancouver"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={loading}
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          onClick={handleSend}
          disabled={loading || !inputValue.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
