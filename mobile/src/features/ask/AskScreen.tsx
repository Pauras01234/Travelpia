/**
 * Ask TravelPia — the hero Q&A flow (design screens 05 + 06).
 *
 * One screen, four states driven by {@link useAsk}: idle (prompts), thinking,
 * answered, and error. The county chip and Fast/Detailed toggle set the query
 * context; the input is pinned to the bottom above the keyboard.
 */
import { useCallback, useState } from "react";
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
import { DEFAULT_COUNTY, type County } from "@/constants/counties";
import { SUGGESTED_PROMPTS } from "@/constants/prompts";
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

  const [county, setCounty] = useState<County>(DEFAULT_COUNTY);
  const [mode, setMode] = useState<AskMode>("fast");
  const [question, setQuestion] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length < 3) return;
      ask.submit({ county, question: trimmed, mode });
      setQuestion("");
    },
    [ask, county, mode],
  );

  const handleEdit = useCallback(() => {
    setQuestion(ask.lastQuestion ?? "");
    ask.reset();
  }, [ask]);

  const isIdle = ask.status === "idle";

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
        <CountyChip county={county} onPress={() => setPickerOpen(true)} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isIdle ? (
            <EmptyState
              county={county}
              onPickPrompt={(text) => submit(text)}
            />
          ) : (
            <View style={styles.conversation}>
              {ask.lastQuestion && <QuestionBubble text={ask.lastQuestion} />}
              {ask.status === "thinking" && <ThinkingState />}
              {ask.status === "answered" && ask.answer && (
                <AnswerView answer={ask.answer} />
              )}
              {ask.status === "error" && ask.error && (
                <ErrorRetry
                  title={ask.error.title}
                  message={ask.error.message}
                  onRetry={ask.error.retryable ? ask.retry : undefined}
                  onEdit={handleEdit}
                />
              )}
              {ask.status === "answered" && (
                <Pressable
                  onPress={ask.reset}
                  style={styles.askAgain}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={18}
                    color={theme.colors.primary}
                  />
                  <AppText variant="bodySemibold" color={theme.colors.primary}>
                    Ask something else
                  </AppText>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>

        {/* Footer: mode toggle (idle only) + input */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          {isIdle && (
            <ModeToggle mode={mode} onChange={setMode} />
          )}
          <AskInput
            value={question}
            onChangeText={setQuestion}
            onSubmit={() => submit(question)}
            county={county}
            disabled={ask.status === "thinking"}
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
  askAgain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
});
