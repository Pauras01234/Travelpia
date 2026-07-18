/**
 * Conversation controller for Ask TravelPia.
 *
 * Holds the running thread of messages, sends recent turns as `history` so the
 * assistant has short-term memory, and manages the request lifecycle
 * (cancellation, retry-without-duplicating, error mapping). The screen renders
 * `messages` + `phase` and calls `ask`/`retry`/`editLast`/`reset`.
 */
import { useCallback, useRef, useState } from "react";

import { askTravelPia } from "@/api/ask";
import { ApiError } from "@/api/client";
import type { AskMode, AskResponse, Turn } from "@/api/types";

/** How many prior turns to send as context (bounded for cost/latency). */
const HISTORY_LIMIT = 8;

export type AskPhase = "idle" | "thinking" | "error";

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; response: AskResponse };

export interface AskErrorInfo {
  title: string;
  message: string;
  retryable: boolean;
}

interface AskParams {
  county: string;
  question: string;
  mode: AskMode;
}

export interface AskController {
  messages: ChatMessage[];
  phase: AskPhase;
  error: AskErrorInfo | null;
  ask: (params: AskParams) => void;
  retry: () => void;
  /** Removes the last (failed) user turn and returns its text to re-edit. */
  editLast: () => string;
  reset: () => void;
}

function toErrorInfo(err: unknown): AskErrorInfo {
  if (err instanceof ApiError) {
    return {
      title: "Couldn't reach TravelPia",
      message: err.message,
      retryable: err.isRetryable,
    };
  }
  return {
    title: "Something went wrong",
    message: "Please try again in a moment.",
    retryable: true,
  };
}

export function useAsk(): AskController {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<AskPhase>("idle");
  const [error, setError] = useState<AskErrorInfo | null>(null);

  // Kept in sync with `messages` so we can read the latest thread synchronously
  // when building history, without stale closures.
  const messagesRef = useRef<ChatMessage[]>([]);
  const controllerRef = useRef<AbortController | null>(null);
  const lastParamsRef = useRef<AskParams | null>(null);
  const idRef = useRef(0);

  const nextId = () => `m${idRef.current++}`;

  const setThread = useCallback(
    (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setMessages((prev) => {
        const next = updater(prev);
        messagesRef.current = next;
        return next;
      });
    },
    [],
  );

  const buildHistory = useCallback((): Turn[] => {
    return messagesRef.current
      .map((m): Turn =>
        m.role === "user"
          ? { role: "user", content: m.text }
          : { role: "assistant", content: m.response.answer },
      )
      .slice(-HISTORY_LIMIT);
  }, []);

  const run = useCallback(
    (params: AskParams, history: Turn[]) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      lastParamsRef.current = params;

      setError(null);
      setPhase("thinking");

      askTravelPia({ ...params, history }, { signal: controller.signal })
        .then((res) => {
          if (controller.signal.aborted) return;
          setThread((prev) => [
            ...prev,
            { id: nextId(), role: "assistant", response: res },
          ]);
          setPhase("idle");
        })
        .catch((err) => {
          if (controller.signal.aborted || err?.name === "AbortError") return;
          setError(toErrorInfo(err));
          setPhase("error");
        });
    },
    [setThread],
  );

  const ask = useCallback(
    (params: AskParams) => {
      // History is the conversation *before* this new question.
      const history = buildHistory();
      setThread((prev) => [
        ...prev,
        { id: nextId(), role: "user", text: params.question },
      ]);
      run(params, history);
    },
    [buildHistory, run, setThread],
  );

  const retry = useCallback(() => {
    const params = lastParamsRef.current;
    if (!params) return;
    // The failed user turn is still in the thread; re-run without re-adding it.
    const historyWithoutLast = messagesRef.current
      .slice(0, -1)
      .map((m): Turn =>
        m.role === "user"
          ? { role: "user", content: m.text }
          : { role: "assistant", content: m.response.answer },
      )
      .slice(-HISTORY_LIMIT);
    run(params, historyWithoutLast);
  }, [run]);

  const editLast = useCallback((): string => {
    controllerRef.current?.abort();
    let removedText = "";
    setThread((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "user") {
        removedText = last.text;
        return prev.slice(0, -1);
      }
      return prev;
    });
    setError(null);
    setPhase("idle");
    return removedText;
  }, [setThread]);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setThread(() => []);
    setError(null);
    setPhase("idle");
    lastParamsRef.current = null;
  }, [setThread]);

  return { messages, phase, error, ask, retry, editLast, reset };
}
