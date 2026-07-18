/** The bottom "Ask about {county}..." input with a send button. */
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";

interface AskInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  county: string;
  disabled?: boolean;
}

export function AskInput({
  value,
  onChangeText,
  onSubmit,
  county,
  disabled = false,
}: AskInputProps) {
  const theme = useTheme();
  const canSend = value.trim().length >= 1 && !disabled;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.pill,
        },
      ]}
    >
      <TextInput
        style={[styles.input, { color: theme.colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={`Ask about ${county}...`}
        placeholderTextColor={theme.colors.textMuted}
        returnKeyType="send"
        onSubmitEditing={() => canSend && onSubmit()}
        editable={!disabled}
        multiline
        blurOnSubmit
        accessibilityLabel="Ask a question"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send question"
        accessibilityState={{ disabled: !canSend }}
        disabled={!canSend}
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.send,
          {
            backgroundColor: theme.colors.accent,
            opacity: canSend ? (pressed ? 0.85 : 1) : 0.4,
          },
        ]}
      >
        <Ionicons name="arrow-forward" size={20} color={theme.colors.onAccent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
