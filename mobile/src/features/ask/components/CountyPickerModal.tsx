/** Bottom-sheet-style modal to switch the active county. */
import { Ionicons } from "@expo/vector-icons";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { COUNTIES, type County } from "@/constants/counties";
import { useTheme } from "@/theme/ThemeProvider";

interface CountyPickerModalProps {
  visible: boolean;
  selected: string;
  onSelect: (county: County) => void;
  onClose: () => void;
}

export function CountyPickerModal({
  visible,
  selected,
  onSelect,
  onClose,
}: CountyPickerModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
        onPress={onClose}
      >
        {/* Stop propagation so taps inside the sheet don't dismiss it. */}
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.card,
              borderTopLeftRadius: theme.radius.card,
              borderTopRightRadius: theme.radius.card,
              paddingBottom: insets.bottom + theme.spacing.md,
            },
          ]}
          onPress={() => {}}
        >
          <View style={styles.header}>
            <AppText variant="heading">Choose a county</AppText>
            <Pressable onPress={onClose} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={theme.colors.textMuted} />
            </Pressable>
          </View>
          <FlatList
            data={COUNTIES}
            keyExtractor={(item) => item}
            style={{ maxHeight: 420 }}
            renderItem={({ item }) => {
              const isSelected = item === selected;
              return (
                <Pressable
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      borderBottomColor: theme.colors.border,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <AppText
                    variant={isSelected ? "bodySemibold" : "body"}
                    color={isSelected ? theme.colors.primary : theme.colors.text}
                  >
                    {item}
                  </AppText>
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={theme.colors.primary}
                    />
                  )}
                </Pressable>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: { paddingHorizontal: 20, paddingTop: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
