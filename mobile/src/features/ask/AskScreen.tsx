/**
 * Ask TravelPia — the hero Q&A flow (design screens 05 + 06), now a running
 * conversation thread with short-term memory.
 *
 * States are driven by {@link useAsk}: an empty prompt screen until the first
 * message, then a scrolling thread of question bubbles and grounded answers,
 * with a transient "thinking" state and graceful error/retry. Recent turns are
 * sent as history so follow-ups ("what about food there?") and short replies
 * ("okay") are understood in context.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/AppText";
import type { AskMode } from "@/api/types";
import { SUGGESTED_PROMPTS } from "@/constants/prompts";
import { useExplore } from "@/features/explore/ExploreContext";
import { useTheme } from "@/theme/ThemeProvider";

import { AnswerView } from "./components/AnswerView";
import { AskInput } from "./components/AskInput";
import { CountyChip } from "./components/CountyChip";
import { CountyPickerModal } from "./components/CountyPickerModal";
import { ErrorRetry } from "./components/ErrorRetry";
import { ModeToggle } from "./components/ModeToggle";
import { PromptCard } from "./components/PromptCard";
import { QuestionBubble } from "./components/QuestionBubble";
import { ThinkingState } from "./components/ThinkingState";
import { useAsk } from "./useAsk";

export function AskScreen() {
  const theme = useTheme();
  const ask = useAsk();
  const scrollRef = useRef<ScrollView>(null);

  const { county, setCounty, exploreFromAsk } = useExplore();
  const [mode, setMode] = useState<AskMode>("fast");
  const [question, setQuestion] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  // When a grounded answer arrives, point the Map at the question that produced
  // it, so switching to the Map tab shows those places as pins.
  const processedRef = useRef<string | null>(null);
  useEffect(() => {
    const msgs = ask.messages;
    const last = msgs[msgs.length - 1];
    if (!last || last.role !== "assistant" || last.id === processedRef.current) {
      return;
    }
    processedRef.current = last.id;
    if (last.response.grounded) {
      const lastUser = [...msgs].reverse().find((m) => m.role === "user");
      if (lastUser && lastUser.role === "user") {
        exploreFromAsk(last.response.county, lastUser.text);
      }
    }
  }, [ask.messages, exploreFromAsk]);

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length < 1 || ask.phase === "thinking") return;
      ask.ask({ county, question: trimmed, mode });
      setQuestion("");
    },
    [ask, county, mode],
  );

  const handleEdit = useCallback(() => {
    setQuestion(ask.editLast());
  }, [ask]);

  const hasThread = ask.messages.length > 0 || ask.phase !== "idle";

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.surface }]}
      edges={["top", "left", "right"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="location" size={16} color={theme.colors.onPrimary} />
          </View>
          <AppText variant="heading">Ask TravelPia</AppText>
        </View>
        <View style={styles.headerActions}>
          {hasThread && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start a new conversation"
              onPress={ask.reset}
              hitSlop={8}
              style={({ pressed }) => [styles.newBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
            </Pressable>
          )}
          <CountyChip county={county} onPress={() => setPickerOpen(true)} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            hasThread && scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {!hasThread ? (
            <EmptyState county={county} onPickPrompt={(text) => submit(text)} />
          ) : (
            <View style={styles.conversation}>
              {ask.messages.map((m) =>
                m.role === "user" ? (
                  <QuestionBubble key={m.id} text={m.text} />
                ) : (
                  <AnswerView key={m.id} answer={m.response} />
                ),
              )}
              {ask.phase === "thinking" && <ThinkingState />}
              {ask.phase === "error" && ask.error && (
                <ErrorRetry
                  title={ask.error.title}
                  message={ask.error.message}
                  onRetry={ask.error.retryable ? ask.retry : undefined}
                  onEdit={handleEdit}
                />
              )}
            </View>
          )}
        </ScrollView>

        {/* Footer: mode toggle (empty state only) + input */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          {!hasThread && <ModeToggle mode={mode} onChange={setMode} />}
          <AskInput
            value={question}
            onChangeText={setQuestion}
            onSubmit={() => submit(question)}
            county={county}
            disabled={ask.phase === "thinking"}
          />
        </View>
      </KeyboardAvoidingView>

      <CountyPickerModal
        visible={pickerOpen}
        selected={county}
        onSelect={setCounty}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

function EmptyState({
  county,
  onPickPrompt,
}: {
  county: string;
  onPickPrompt: (text: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyAvatar, { backgroundColor: theme.colors.primary }]}>
        <Ionicons
          name="chatbubble-ellipses"
          size={22}
          color={theme.colors.onPrimary}
        />
      </View>
      <AppText variant="title">{`Ask me anything\nabout ${county}`}</AppText>
      <AppText variant="body" color={theme.colors.textMuted}>
        Your local friend for exploring Ireland. Grounded answers with real
        sources, photos and places on the map.
      </AppText>

      <AppText
        variant="caption"
        color={theme.colors.textMuted}
        style={styles.tryLabel}
      >
        TRY ASKING
      </AppText>
      <View style={styles.prompts}>
        {SUGGESTED_PROMPTS.map((prompt, index) => (
          <PromptCard
            key={index}
            emoji={prompt.emoji}
            label={prompt.label(county)}
            onPress={() => onPickPrompt(prompt.build(county))}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  newBtn: { padding: 4 },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 20, paddingBottom: 32, flexGrow: 1 },
  conversation: { gap: 16 },
  empty: { gap: 12 },
  emptyAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  tryLabel: { marginTop: 12, letterSpacing: 0.5 },
  prompts: { gap: 10 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
});
