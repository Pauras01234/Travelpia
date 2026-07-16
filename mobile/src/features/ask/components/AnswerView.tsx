/**
 * The answer payload (design screen 06): a grounded-source badge, the
 * scannable answer text, the photo gallery, and cited sources.
 *
 * Note: the design also shows structured, numbered "place cards" with
 * distance/difficulty chips. Those require the backend to return structured
 * places rather than a single answer string — a deliberate future extension
 * of the /ask contract. Until then we render the grounded prose answer.
 */
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import type { AskResponse } from "@/api/types";
import { useTheme } from "@/theme/ThemeProvider";

import { PhotoGallery } from "./PhotoGallery";
import { SourceList } from "./SourceList";

export function AnswerView({ answer }: { answer: AskResponse }) {
  const theme = useTheme();
  const sourceCount = answer.sources.length;

  return (
    <View style={styles.wrap}>
      <View style={styles.badgeRow}>
        <View
          style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
        >
          <Ionicons
            name="chatbubble-ellipses"
            size={14}
            color={theme.colors.onPrimary}
          />
        </View>
        <AppText variant="bodySemibold">TravelPia</AppText>
        {answer.grounded && sourceCount > 0 && (
          <AppText variant="caption" color={theme.colors.textMuted}>
            {`grounded in ${sourceCount} source${sourceCount === 1 ? "" : "s"}`}
          </AppText>
        )}
        {answer.cached && (
          <View
            style={[styles.cachedPill, { backgroundColor: theme.colors.chipBg }]}
          >
            <Ionicons name="flash" size={11} color={theme.colors.success} />
            <AppText variant="caption" color={theme.colors.textMuted}>
              instant
            </AppText>
          </View>
        )}
      </View>

      <AppText variant="body" style={styles.answerText}>
        {answer.answer}
      </AppText>

      <PhotoGallery images={answer.images} />
      <SourceList sources={answer.sources} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cachedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  answerText: { lineHeight: 24 },
});
