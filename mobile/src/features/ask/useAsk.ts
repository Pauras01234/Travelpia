/**
 * Ask request lifecycle as a small state machine. Encapsulates cancellation of
 * in-flight requests, error mapping, and the "last query" needed for retry, so
 * the screen stays declarative.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { askTravelPia } from "@/api/ask";
import { ApiError } from "@/api/client";
import type { AskMode, AskResponse } from "@/api/types";

export type AskStatus = "idle" | "thinking" | "answered" | "error";

export interface AskErrorInfo {
  title: string;
  message: string;
  retryable: boolean;
}

interface Query {
  county: string;
  question: string;
  mode: AskMode;
}

export interface AskController {
  status: AskStatus;
  answer: AskResponse | null;
  error: AskErrorInfo | null;
  lastQuestion: string | null;
  submit: (query: Query) => void;
  retry: () => void;
  reset: () => void;
}

function toErrorInfo(err: unknown): AskErrorInfo {
  if (err instanceof ApiError) {
    if (err.code === "no_results") {
      return {
        title: "No results yet",
        message: err.message,
        retryable: false,
      };
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

export function useAsk(): AskController {
  const [status, setStatus] = useState<AskStatus>("idle");
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [error, setError] = useState<AskErrorInfo | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef<Query | null>(null);

  const run = useCallback((query: Query) => {
    // Cancel any request still in flight before starting a new one.
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    lastQueryRef.current = query;

    setError(null);
    setAnswer(null);
    setStatus("thinking");

    askTravelPia(query, { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return;
        setAnswer(res);
        setStatus("answered");
      })
      .catch((err) => {
        // A superseded/cancelled request must not clobber newer state.
        if (controller.signal.aborted || err?.name === "AbortError") return;
        setError(toErrorInfo(err));
        setStatus("error");
      });
  }, []);

  const retry = useCallback(() => {
    if (lastQueryRef.current) run(lastQueryRef.current);
  }, [run]);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setStatus("idle");
    setAnswer(null);
    setError(null);
  }, []);

  // Abort on unmount to avoid setting state on a torn-down screen.
  useEffect(() => () => controllerRef.current?.abort(), []);

  return {
    status,
    answer,
    error,
    lastQuestion: lastQueryRef.current?.question ?? null,
    submit: run,
    retry,
    reset,
  };
}
