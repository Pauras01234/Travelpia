/** Search input for the Map screen: "Search places in {county}". */
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TextInput, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  county: string;
}

export function SearchBar({ value, onChangeText, county }: SearchBarProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.control,
        },
      ]}
    >
      <Ionicons name="search" size={18} color={theme.colors.textMuted} />
      <TextInput
        style={[styles.input, { color: theme.colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={`Search places in ${county}`}
        placeholderTextColor={theme.colors.textMuted}
        returnKeyType="search"
        clearButtonMode="while-editing"
        accessibilityLabel="Search places"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
});
