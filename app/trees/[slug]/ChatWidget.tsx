"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Props = {
  treeId: string;
};

export default function ChatWidget({ treeId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [noApiKey, setNoApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSendingRef = useRef(false);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll runs on messages change intentionally
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Escape key closes panel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isStreaming || isSendingRef.current) return;
    isSendingRef.current = true;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setError(null);
    setIsStreaming(true);

    const assistantId = crypto.randomUUID();
    // Placeholder for streaming assistant response
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch(`/api/trees/${treeId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json.code === "NO_API_KEY") {
          setNoApiKey(true);
          setMessages((prev) => prev.slice(0, -1)); // remove placeholder
          return;
        }
        throw new Error(json.error ?? "Chat failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response stream");

      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setMessages((prev) => {
          return prev.map((m) =>
            m.id === assistantId ? { ...m, content: accumulated } : m,
          );
        });
      }
    } catch (err) {
      setMessages((prev) => prev.slice(0, -1)); // remove empty placeholder
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsStreaming(false);
      isSendingRef.current = false;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "60vh",
        borderRadius: "12px 12px 0 0",
        zIndex: 50,
        background: "var(--parchment-2, var(--parchment))",
        border: "1px solid var(--border)",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
        display: "flex",
        flexDirection: "column",
      }
    : {
        position: "fixed",
        bottom: "70px",
        right: "16px",
        width: "380px",
        height: "520px",
        borderRadius: "var(--radius-lg, 10px)",
        zIndex: 50,
        background: "var(--parchment-2, var(--parchment))",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
      };

  return (
    <>
      {/* Chat panel */}
      {isOpen && (
        <div style={panelStyle} role="dialog" aria-label="Family history chat">
          {/* Header */}
          <div
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid var(--border-light, var(--border))",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "var(--brown-text)",
                  fontFamily: "var(--font-ui, inherit)",
                  margin: 0,
                }}
              >
                Family Assistant
              </p>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--brown-muted)",
                  fontFamily: "var(--font-ui, inherit)",
                  margin: 0,
                }}
              >
                Ask about your family
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "1.125rem",
                color: "var(--brown-muted)",
                padding: "4px",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {messages.length === 0 && !noApiKey && (
              <p
                style={{
                  fontSize: "0.9375rem",
                  color: "var(--brown-muted)",
                  fontStyle: "italic",
                  fontFamily: "var(--font-serif, Georgia, serif)",
                  textAlign: "center",
                  marginTop: "2rem",
                }}
              >
                Ask me anything about your family history…
              </p>
            )}

            {noApiKey && (
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--brown-text)",
                  fontFamily: "var(--font-serif, Georgia, serif)",
                  lineHeight: 1.6,
                  padding: "0.75rem",
                  background: "var(--parchment-3, var(--parchment))",
                  borderRadius: "var(--radius-md, 6px)",
                  border: "1px solid var(--border)",
                }}
              >
                Chat isn&apos;t available for this tree yet. Ask the tree owner
                to add an Anthropic API key in Settings.
              </p>
            )}

            {messages.map((msg) =>
              msg.role === "user" ? (
                <div
                  key={msg.id}
                  style={{ display: "flex", justifyContent: "flex-end" }}
                >
                  <div
                    style={{
                      background: "var(--parchment-3, #e8dcc8)",
                      color: "var(--brown-text)",
                      fontSize: "0.9375rem",
                      fontFamily: "var(--font-ui, inherit)",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-md, 6px)",
                      maxWidth: "80%",
                      lineHeight: 1.5,
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div
                  key={msg.id}
                  style={{ display: "flex", justifyContent: "flex-start" }}
                >
                  <p
                    style={{
                      fontSize: "0.9375rem",
                      color: "var(--brown-text)",
                      fontFamily: "var(--font-serif, Georgia, serif)",
                      lineHeight: 1.6,
                      margin: 0,
                      maxWidth: "90%",
                    }}
                  >
                    {msg.content || (isStreaming ? "…" : "")}
                  </p>
                </div>
              ),
            )}

            {error && (
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--error, #b91c1c)",
                  fontFamily: "var(--font-ui, inherit)",
                }}
              >
                {error}
              </p>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: "0.75rem 1rem",
              borderTop: "1px solid var(--border-light, var(--border))",
              display: "flex",
              gap: "0.5rem",
              alignItems: "flex-end",
              flexShrink: 0,
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question…"
              rows={1}
              style={{
                flex: 1,
                resize: "none",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md, 6px)",
                padding: "0.5rem 0.625rem",
                fontSize: "0.9375rem",
                fontFamily: "var(--font-ui, inherit)",
                color: "var(--brown-text)",
                background: "var(--parchment)",
                outline: "revert",
                lineHeight: 1.5,
              }}
              aria-label="Chat message"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              style={{
                padding: "0.5rem 0.75rem",
                background: "var(--forest)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-md, 6px)",
                fontSize: "0.875rem",
                fontFamily: "var(--font-ui, inherit)",
                cursor:
                  !input.trim() || isStreaming ? "not-allowed" : "pointer",
                opacity: !input.trim() || isStreaming ? 0.5 : 1,
                flexShrink: 0,
                height: "36px",
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? "Close chat" : "Open family assistant"}
        style={{
          position: "fixed",
          bottom: "16px",
          right: "16px",
          height: "44px",
          padding: "0 1.125rem",
          background: "var(--forest)",
          color: "#fff",
          border: "none",
          borderRadius: "var(--radius-lg, 10px)",
          fontSize: "0.75rem",
          fontWeight: 600,
          fontFamily: "var(--font-ui, inherit)",
          cursor: "pointer",
          zIndex: 51,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
        }}
      >
        <span style={{ fontSize: "0.875rem" }}>💬</span>
        Ask AI
      </button>
    </>
  );
}
