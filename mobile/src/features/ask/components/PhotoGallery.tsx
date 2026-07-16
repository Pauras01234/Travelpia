/** Horizontal photo gallery with attribution (design screen 06). */
import { FlatList, Image, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import type { AskImage } from "@/api/types";
import { useTheme } from "@/theme/ThemeProvider";

export function PhotoGallery({ images }: { images: AskImage[] }) {
  const theme = useTheme();
  if (images.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <AppText variant="caption" color={theme.colors.textMuted} style={styles.label}>
        PHOTOS
      </AppText>
      <FlatList
        data={images}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => `${item.url}-${index}`}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.chipBg,
                borderRadius: theme.radius.control,
              },
            ]}
          >
            <Image
              source={{ uri: item.url }}
              style={[styles.image, { borderRadius: theme.radius.control }]}
              accessibilityLabel={item.alt || "Travel photo"}
              resizeMode="cover"
            />
            {!!item.credit && (
              <AppText
                variant="caption"
                color={theme.colors.textMuted}
                numberOfLines={1}
                style={styles.credit}
              >
                {item.credit}
              </AppText>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { letterSpacing: 0.5 },
  list: { gap: 10, paddingRight: 4 },
  card: { width: 220, overflow: "hidden" },
  image: { width: 220, height: 140 },
  credit: { paddingHorizontal: 8, paddingVertical: 6 },
});
