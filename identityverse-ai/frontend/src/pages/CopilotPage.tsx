import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import type { CopilotMessage } from "@/types";

const SUGGESTIONS = [
  { key: "F1", cmd: "show dormant admins" },
  { key: "F2", cmd: "show orphan accounts" },
  { key: "F3", cmd: "top 5 risky users" },
  { key: "F4", cmd: "show cross platform admins" },
];

const BOOT_LINES = [
  "INITIALIZING IDENTITY RISK COPILOT...",
  "LOADING CROSS-PLATFORM THREAT CONTEXT...",
  "SESSION READY.",
];

const BAND_COLOR: Record<string, string> = {
  LOW: "#34D399",
  MEDIUM: "#FBBF24",
  HIGH: "#FB8B3C",
  CRITICAL: "#FB4768",
};

function TypedText({ text, speed = 12, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return <>{shown}</>;
}

export default function CopilotPage() {
  const [booted, setBooted] = useState(false);
  const [bootLineIndex, setBootLineIndex] = useState(0);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bootLineIndex >= BOOT_LINES.length) {
      setBooted(true);
      setMessages([
        {
          role: "assistant",
          text: "Ask about dormant admins, orphan accounts, top risky identities, or why a specific person is flagged.",
        },
      ]);
      return;
    }
    const t = setTimeout(() => setBootLineIndex((i) => i + 1), 320);
    return () => clearTimeout(t);
  }, [bootLineIndex]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, bootLineIndex]);

  const send = async (question: string) => {
    if (!question.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.chatCopilot(question);
      setMessages((m) => [...m, { role: "assistant", text: res.answer, data: res.data }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "ERROR: backend unreachable. Confirm uvicorn is running on port 8000." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const lastIndex = messages.length - 1;

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
          Security Copilot
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1.5">
          Rule-based answers for direct questions, Groq for everything else.
        </p>
      </div>

      <div
        className="flex-1 flex flex-col rounded-xl overflow-hidden border"
        style={{
          background: "linear-gradient(180deg, #050709 0%, #080B10 100%)",
          borderColor: "rgba(45,226,200,0.25)",
          boxShadow: "0 0 0 1px rgba(45,226,200,0.08), 0 0 40px -12px rgba(45,226,200,0.25)",
        }}
      >
        {/* Terminal chrome */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b shrink-0"
          style={{ borderColor: "rgba(45,226,200,0.15)", background: "rgba(45,226,200,0.04)" }}
        >
          <span className="font-mono text-[11px] tracking-wide text-[var(--color-identity)]">
            SECURITY_COPILOT &gt; analyst_session
          </span>
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-[var(--color-risk-low)]" />
            </span>
            <span className="font-mono text-[10px] text-[var(--color-text-muted)]">CONNECTED</span>
          </span>
        </div>

        {/* Scrolling log */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-4 font-mono text-[13px] leading-relaxed space-y-3"
        >
          {!booted ? (
            <div className="text-[var(--color-identity)]">
              {BOOT_LINES.slice(0, bootLineIndex + 1).map((line, i) => (
                <div key={i} className="opacity-90">
                  {i === bootLineIndex ? <TypedText text={line} speed={10} /> : line}
                </div>
              ))}
            </div>
          ) : (
            messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={m.role === "user" ? "" : "pl-3 border-l-2"}
                style={m.role === "assistant" ? { borderColor: "rgba(155,123,255,0.4)" } : undefined}
              >
                {m.role === "user" ? (
                  <div className="text-[var(--color-identity)]">
                    <span className="text-[var(--color-text-muted)]">analyst@accessdna:~$ </span>
                    {m.text}
                  </div>
                ) : (
                  <div>
                    <div className="text-[10px] tracking-wide mb-1" style={{ color: "var(--color-ai)" }}>
                      [COPILOT]
                    </div>
                    <div className="text-[var(--color-text-secondary)]">
                      {i === lastIndex ? <TypedText text={m.text} /> : m.text}
                    </div>
                    {Array.isArray(m.data) && m.data.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {(m.data as any[]).map((d, j) => (
                          <div
                            key={j}
                            className="flex items-center justify-between text-xs px-2 py-1 rounded border-l-2"
                            style={{
                              borderColor: BAND_COLOR[d.risk_band] ?? "var(--color-border)",
                              background: "rgba(255,255,255,0.02)",
                            }}
                          >
                            <span className="text-[var(--color-text-primary)]">{d.full_name}</span>
                            <span style={{ color: BAND_COLOR[d.risk_band] ?? "var(--color-text-muted)" }}>
                              {d.risk_score?.toFixed?.(0) ?? d.risk_band}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))
          )}
          {loading && (
            <div className="pl-3 border-l-2 text-[var(--color-text-muted)]" style={{ borderColor: "rgba(155,123,255,0.4)" }}>
              <span className="inline-block animate-pulse">▋</span> querying...
            </div>
          )}
        </div>

        {/* Function-key command shortcuts */}
        <div className="flex flex-wrap gap-1.5 px-5 pt-2 pb-1 border-t shrink-0" style={{ borderColor: "rgba(45,226,200,0.1)" }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => send(s.cmd)}
              disabled={!booted}
              className="font-mono text-[11px] px-2 py-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-identity)] transition-colors disabled:opacity-30"
            >
              <span className="text-[var(--color-identity)]">[{s.key}]</span> {s.cmd}
            </button>
          ))}
        </div>

        {/* Terminal prompt input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 px-5 py-3 font-mono text-sm"
          onClick={() => inputRef.current?.focus()}
        >
          <span className="text-[var(--color-text-muted)] shrink-0">analyst@accessdna:~$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!booted}
            placeholder={booted ? "type a command..." : ""}
            className="flex-1 bg-transparent outline-none text-[var(--color-identity)] placeholder:text-[var(--color-text-muted)] disabled:opacity-50"
            autoFocus
          />
          <span className="w-2 h-4 bg-[var(--color-identity)] animate-pulse shrink-0" />
        </form>
      </div>
    </div>
  );
}
