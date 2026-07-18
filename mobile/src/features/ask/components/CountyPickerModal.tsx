/** Bottom-sheet county selector using a 3D wheel picker. */
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { WheelPicker } from "@/components/WheelPicker";
import { COUNTIES, type County } from "@/constants/counties";
import { useTheme } from "@/theme/ThemeProvider";

interface CountyPickerModalProps {
  visible: boolean;
  selected: string;
  onSelect: (county: County) => void;
  onClose: () => void;
}

const COUNTY_LIST: string[] = [...COUNTIES];

export function CountyPickerModal({
  visible,
  selected,
  onSelect,
  onClose,
}: CountyPickerModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const initialIndex = Math.max(0, COUNTY_LIST.indexOf(selected));
  const [index, setIndex] = useState(initialIndex);

  // Reset the wheel to the current county each time the sheet opens.
  useEffect(() => {
    if (visible) setIndex(Math.max(0, COUNTY_LIST.indexOf(selected)));
  }, [visible, selected]);

  const commit = () => {
    onSelect(COUNTY_LIST[index] as County);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
        onPress={onClose}
      >
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

          {visible && (
            <WheelPicker
              key={`wheel-${initialIndex}`}
              items={COUNTY_LIST}
              selectedIndex={initialIndex}
              onChange={setIndex}
            />
          )}

          <View style={styles.footer}>
            <Button label={`Choose ${COUNTY_LIST[index]}`} onPress={commit} />
          </View>
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
  footer: { marginTop: 16 },
});
