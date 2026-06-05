"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Zap, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[1]) parts.push(<strong key={match.index} className="font-semibold text-foreground">{match[1]}</strong>);
    else if (match[2]) parts.push(<em key={match.index}>{match[2]}</em>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let bullets: string[] = [];

  function flushBullets() {
    if (bullets.length === 0) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`} className="list-disc pl-4 space-y-0.5 my-1">
        {bullets.map((b, i) => <li key={i}>{parseInline(b)}</li>)}
      </ul>
    );
    bullets = [];
  }

  for (const line of lines) {
    if (line.startsWith("- ") || line.startsWith("• ")) {
      bullets.push(line.slice(2));
    } else {
      flushBullets();
      if (line === "") {
        nodes.push(<br key={`br-${nodes.length}`} />);
      } else if (line.startsWith("### ")) {
        nodes.push(<p key={`h-${nodes.length}`} className="font-semibold text-foreground mt-1">{parseInline(line.slice(4))}</p>);
      } else if (line.startsWith("## ") || line.startsWith("# ")) {
        const text = line.replace(/^#+\s/, "");
        nodes.push(<p key={`h-${nodes.length}`} className="font-bold text-foreground mt-1">{parseInline(text)}</p>);
      } else {
        nodes.push(<p key={`p-${nodes.length}`}>{parseInline(line)}</p>);
      }
    }
  }
  flushBullets();
  return <div className="space-y-0.5">{nodes}</div>;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function CoachChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [ready, setReady] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

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

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;

    if (!SR) {
      toast.error("Voice input isn't supported in this browser. Try Chrome or Edge.");
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); };

    recognition.onresult = (event: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => {
      const transcript = Array.from(Object.values(event.results))
        .map((r: { [k: number]: { transcript: string } }) => r[0].transcript)
        .join("");
      setInput(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

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

    // Stop voice if still going
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    }

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
              ) : msg.role === "assistant" ? (
                <MarkdownMessage content={msg.content} />
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
          placeholder={
            listening
              ? "Listening…"
              : ready
              ? "Ask your coach anything… or tap the mic"
              : "Coach is loading…"
          }
          rows={2}
          className={cn("resize-none flex-1", listening && "border-red-500/50")}
          disabled={!ready || streaming}
        />

        {/* Voice button */}
        <Button
          size="sm"
          variant={listening ? "destructive" : "outline"}
          onClick={toggleVoice}
          disabled={!ready || streaming}
          className="h-[60px] px-3"
          title={listening ? "Stop recording" : "Voice input"}
        >
          {listening ? (
            <MicOff className="h-3.5 w-3.5 animate-pulse" />
          ) : (
            <Mic className="h-3.5 w-3.5" />
          )}
        </Button>

        {/* Send button */}
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

      {listening && (
        <p className="text-[10px] text-red-400 text-center mt-1.5 animate-pulse">
          Listening — speak now, then tap mic again or press Send
        </p>
      )}
    </div>
  );
}
