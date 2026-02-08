"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hey! 👋 I know Gio's entire 2026 travel calendar. Ask me where he is, where he's going next, or anything about his plans!",
};

const STORAGE_KEY = "chat-rate-limit";
const DAILY_LIMIT = 10;

function getStoredRemaining(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DAILY_LIMIT;
    const { count, date } = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (date !== today) return DAILY_LIMIT;
    return Math.max(0, DAILY_LIMIT - count);
  } catch {
    return DAILY_LIMIT;
  }
}

function incrementStored(): number {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let count = 1;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) count = parsed.count + 1;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count, date: today }));
    return Math.max(0, DAILY_LIMIT - count);
  } catch {
    return DAILY_LIMIT - 1;
  }
}

interface ChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  onScrollToToday: () => void;
}

export function ChatWidget({ isOpen, onClose, onScrollToToday }: ChatWidgetProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Ask Gio&apos;s Calendar</DrawerTitle>
            <DrawerDescription>Chat about Gio&apos;s travel plans</DrawerDescription>
          </DrawerHeader>
          <ChatContent onClose={onClose} onScrollToToday={onScrollToToday} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed bottom-20 right-6 z-50 w-[380px] h-[500px] rounded-xl border bg-card/95 backdrop-blur-sm shadow-2xl flex flex-col overflow-hidden"
        >
          <ChatContent onClose={onClose} onScrollToToday={onScrollToToday} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ChatContent({
  onClose,
  onScrollToToday,
}: {
  onClose: () => void;
  onScrollToToday: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [remaining, setRemaining] = useState(DAILY_LIMIT);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setRemaining(getStoredRemaining());
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming || remaining <= 0) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    // Build history for API (exclude welcome message)
    const history = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      // Update remaining from header
      const serverRemaining = res.headers.get("x-remaining-messages");
      if (serverRemaining !== null) {
        setRemaining(parseInt(serverRemaining, 10));
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Something went wrong" }));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: err.error || "Something went wrong. Try again!" }
              : m
          )
        );
        setIsStreaming(false);
        return;
      }

      // Track usage client-side
      const newRemaining = incrementStored();
      setRemaining(newRemaining);

      // Stream the response
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const snapshot = accumulated;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: snapshot } : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Oops, something went wrong. Try again!" }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, remaining, messages]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const exhausted = remaining <= 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">💬</span>
          <AnimatedShinyText className="text-sm font-semibold !mx-0">
            Ask Gio&apos;s Calendar
          </AnimatedShinyText>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onClose();
              setTimeout(onScrollToToday, 200);
            }}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Jump to today
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close chat"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-foreground/10 text-foreground"
                  : "bg-muted border text-foreground"
              }`}
            >
              {msg.content || <StreamingDots />}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3 shrink-0">
        {exhausted ? (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">
              You&apos;ve used all 10 messages for today.
            </p>
            <p className="text-xs text-muted-foreground mt-1">Come back tomorrow! 👋</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 500))}
                onKeyDown={handleKeyDown}
                placeholder="Ask about Gio's travels..."
                disabled={isStreaming}
                rows={1}
                className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 max-h-[80px] overflow-y-auto"
                style={{ minHeight: "36px" }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming}
                className="shrink-0 w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center disabled:opacity-30 hover:opacity-90 transition-opacity"
                aria-label="Send message"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M14 2L7 9M14 2L9.5 14L7 9M14 2L2 6.5L7 9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-center">
              {remaining} message{remaining !== 1 ? "s" : ""} left today
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function StreamingDots() {
  return (
    <span className="inline-flex gap-1 items-center h-5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}
