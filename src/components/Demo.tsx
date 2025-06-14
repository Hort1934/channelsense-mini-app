// ...existing code...
import { useState } from "react";
import { APP_NAME } from "~/lib/constants";

// Додаємо підтримку натискання Enter для відправки запиту
export default function Demo({ title = APP_NAME }: { title?: string }) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  // Додаємо стан для вибору режиму
  const [mode, setMode] = useState<"analytics" | "admin" | "summary">("analytics");

  const askAI = async (customMode?: string) => {
    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query, mode: customMode || mode }),
      });

      const data = await res.json();
      setResponse(data.result);
    } catch (_err) {
      setResponse("⚠️ Помилка при запиті до AI.");
    } finally {
      setLoading(false);
    }
  };

  // Обробник натискання Enter+Ctrl/Cmd
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
        <button
          onClick={() => { setMode("analytics"); askAI("analytics"); }}
          className={`px-4 py-2 rounded ${mode === "analytics" ? "bg-indigo-700 text-white" : "bg-indigo-600 text-white"}`}
        >
          Аналітика
        </button>
        <button
          onClick={() => { setMode("admin"); askAI("admin"); }}
          className={`px-4 py-2 rounded ${mode === "admin" ? "bg-green-700 text-white" : "bg-green-600 text-white"}`}
        >
          Управління
        </button>
        <button
          onClick={() => { setMode("summary"); askAI("summary"); }}
          className={`px-4 py-2 rounded ${mode === "summary" ? "bg-blue-700 text-white" : "bg-blue-600 text-white"}`}
        >
          Звіт
        </button>
      </div>
      <div className="text-left whitespace-pre-line border-t pt-4 mt-4">
        {loading ? "Завантаження..." : response}
      </div>
      <div className="text-xs text-gray-500 mt-2">
        Натисніть <b>Ctrl+Enter</b> (або <b>Cmd+Enter</b> на Mac), щоб відправити запит
      </div>
    </div>
  );
}
//