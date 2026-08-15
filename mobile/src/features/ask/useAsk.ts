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
import { ApiErrorCode, type AskMode, type AskResponse, type Turn } from "@/api/types";
import { usePremium } from "@/features/premium/PremiumContext";

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
    // The server answered deliberately — don't claim we couldn't reach it.
    if (err.code === ApiErrorCode.rateLimited) {
      const seconds = err.retryAfterSeconds;
      return {
        title: "Just a moment",
        message: seconds
          ? `You're asking faster than I can keep up. Try again in ${seconds}s.`
          : "You're asking faster than I can keep up. Try again shortly.",
        retryable: true,
      };
    }
    if (err.code === ApiErrorCode.noResults) {
      return { title: "Nothing found", message: err.message, retryable: false };
    }
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

export interface UseAskOptions {
  /**
   * Called with the user's text when a request was rejected without being
   * answered, so the screen can put it back in the input rather than lose it.
   */
  onQuestionReturned?: (text: string) => void;
}

export function useAsk({ onQuestionReturned }: UseAskOptions = {}): AskController {
  const { reportQuota, handleApiError } = usePremium();
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

  /** Removes the trailing (unanswered) user turn and returns its text. */
  const popLastUserTurn = useCallback((): string => {
    // Read synchronously from the ref — a state updater runs during a later
    // render, so capturing the text inside setThread would return "" here.
    const last = messagesRef.current[messagesRef.current.length - 1];
    const removedText = last?.role === "user" ? last.text : "";
    if (removedText) {
      setThread((prev) =>
        prev[prev.length - 1]?.role === "user" ? prev.slice(0, -1) : prev,
      );
    }
    return removedText;
  }, [setThread]);

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
          // The server is the authority on the allowance; just mirror it.
          reportQuota(res.quota);
          setThread((prev) => [
            ...prev,
            { id: nextId(), role: "assistant", response: res },
          ]);
          setPhase("idle");
        })
        .catch((err) => {
          if (controller.signal.aborted || err?.name === "AbortError") return;

          // Running out of questions, or reaching for a premium mode, is an
          // upgrade moment — the sheet handles it, not the error card. The
          // question never ran, so hand the text back to the input.
          if (handleApiError(err)) {
            const returned = popLastUserTurn();
            setPhase("idle");
            if (returned) onQuestionReturned?.(returned);
            return;
          }

          setError(toErrorInfo(err));
          setPhase("error");
        });
    },
    [
      handleApiError,
      onQuestionReturned,
      popLastUserTurn,
      reportQuota,
      setThread,
    ],
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
    const removedText = popLastUserTurn();
    setError(null);
    setPhase("idle");
    return removedText;
  }, [popLastUserTurn]);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setThread(() => []);
    setError(null);
    setPhase("idle");
    lastParamsRef.current = null;
  }, [setThread]);

  return { messages, phase, error, ask, retry, editLast, reset };
}
