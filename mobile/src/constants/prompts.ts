/**
 * Suggested starter prompts for the Ask empty state (design screen 05).
 * A small helper picks county-relevant phrasing while keeping the emoji cues.
 */
export interface SuggestedPrompt {
  emoji: string;
  /** Builds the question text for the active county. */
  build: (county: string) => string;
  /** Short label shown on the card. */
  label: (county: string) => string;
}

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    emoji: "🥾",
    build: (c) => `Best coastal walks near ${c}?`,
    label: (c) => `Best coastal walks near ${c}?`,
  },
  {
    emoji: "🌧️",
    build: () => "Family things to do on a rainy day",
    label: () => "Family things to do on a rainy day",
  },
  {
    emoji: "🦪",
    build: (c) => `Where to eat fresh seafood in ${c}`,
    label: (c) => `Where to eat fresh seafood in ${c}`,
  },
];
