"use client";

import { useState } from "react";
import { APP_NAME } from "~/lib/constants";

export default function Demo({ title = APP_NAME }: { title?: string }) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"analytics" | "admin" | "summary">("analytics");

  const askAI = async (customMode?: "analytics" | "admin" | "summary") => {
    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query, mode: customMode || mode }),
      });

      const data = await res.json();
      setResponse(data.result || "⚠️ Немає відповіді від AI.");
    } catch (error) {
      console.error("Помилка запиту до AI:", error);
      setResponse("⚠️ Помилка при запиті до AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      askAI();
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto text-center">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>

      <textarea
        className="w-full border p-2 rounded mb-4"
        rows={3}
        placeholder="Введіть запит (наприклад: хто найактивніший цього тижня?)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <div className="flex flex-wrap justify-center gap-4 mb-4">
        {(["analytics", "admin", "summary"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              askAI(m);
            }}
            className={`px-4 py-2 rounded transition-colors ${
              mode === m
                ? {
                    analytics: "bg-indigo-700",
                    admin: "bg-green-700",
                    summary: "bg-blue-700",
                  }[m]
                : {
                    analytics: "bg-indigo-600",
                    admin: "bg-green-600",
                    summary: "bg-blue-600",
                  }[m]
            } text-white`}
          >
            {{
              analytics: "Аналітика",
              admin: "Управління",
              summary: "Звіт",
            }[m]}
          </button>
        ))}
      </div>

      <div className="text-left whitespace-pre-line border-t pt-4 mt-4 min-h-[4rem]">
        {loading ? "Завантаження..." : response}
      </div>

      <div className="text-xs text-gray-500 mt-2">
        Натисніть <b>Ctrl+Enter</b> (або <b>Cmd+Enter</b> на Mac), щоб відправити запит
      </div>
    </div>
  );
}
