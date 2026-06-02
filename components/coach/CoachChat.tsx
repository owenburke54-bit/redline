"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function CoachChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [ready, setReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const pending = localStorage.getItem("coachPendingQuestion");
    if (pending) {
      localStorage.removeItem("coachPendingQuestion");
      const userMsg: Message = { role: "user", content: pending };
      setMessages([userMsg]);
      streamResponse([userMsg]);
    } else {
      loadInitialMessage();
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function streamResponse(msgs: Message[], isInitial = false) {
    setStreaming(true);
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs, isInitial }),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: text };
          return updated;
        });
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Something went wrong. Try refreshing the page.",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
      setReady(true);
    }
  }

  function loadInitialMessage() {
    streamResponse([], true);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming || !ready) return;

    const userMsg: Message = { role: "user", content: text };
    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    setInput("");
    textareaRef.current?.focus();
    await streamResponse(updatedMsgs);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Zap className="h-4 w-4 text-primary animate-pulse" />
              Coach is thinking…
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-foreground"
              )}
            >
              {msg.content === "" ? (
                <span className="flex gap-1 text-muted-foreground">
                  <span className="animate-bounce" style={{ animationDelay: "0ms" }}>·</span>
                  <span className="animate-bounce" style={{ animationDelay: "150ms" }}>·</span>
                  <span className="animate-bounce" style={{ animationDelay: "300ms" }}>·</span>
                </span>
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border pt-4 flex gap-2 items-end shrink-0">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={ready ? "Ask your coach anything…" : "Coach is loading…"}
          rows={2}
          className="resize-none flex-1"
          disabled={!ready || streaming}
        />
        <Button
          size="sm"
          onClick={sendMessage}
          disabled={!ready || streaming || !input.trim()}
          className="h-[60px] px-3"
        >
          {streaming ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
