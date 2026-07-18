# TravelPia Mobile (Expo / React Native)

Dev A's app. This slice implements the **Ask TravelPia** Q&A feature (design
screens 05 + 06) plus the app shell (bottom tabs). Other tabs are on-brand
placeholders owned by other work items.

## Stack

- **Expo SDK 51** + **Expo Router** (file-based navigation, typed routes)
- **TypeScript** (strict)
- Brand fonts via `@expo-google-fonts` (Bricolage Grotesque + Plus Jakarta Sans)
- `@expo/vector-icons` (Ionicons)

## Structure

```
app/                         # Expo Router routes
  _layout.tsx                # fonts, theme + safe-area providers, status bar
  (tabs)/_layout.tsx         # bottom tab bar (Home·Ask·Map·Weather·Profile)
  (tabs)/ask.tsx             # → AskScreen
  (tabs)/{index,map,weather,profile}.tsx   # placeholders
src/
  theme/       tokens.ts (design system), ThemeProvider (light/dark)
  api/         client.ts (fetch + timeout + typed errors), ask.ts, types.ts
  components/  AppText, Button, ComingSoon
  constants/   counties.ts, prompts.ts
  features/ask/
    AskScreen.tsx            # state machine: idle → thinking → answered/error
    useAsk.ts                # request lifecycle (cancel, retry, error mapping)
    components/              # CountyChip, ModeToggle, PromptCard, AskInput,
                             # ThinkingState, QuestionBubble, AnswerView,
                             # PhotoGallery, SourceList, ErrorRetry
```

## Design fidelity

- **Theme** — every colour/space/radius/type value comes from `src/theme/tokens.ts`,
  which encodes the Foundations (01) tokens for both light and dark. Components
  reference semantic roles, so the whole app themes automatically. The Profile
  "Dark mode" toggle will drive `ThemeProvider`'s override.
- **Ask states** — the four states from screen 05 (empty w/ prompts + Fast/Detailed
  toggle + county chip, live "thinking" checklist, graceful error/retry) and the
  screen 06 answer payload (grounded badge, prose answer, photo gallery, cited
  sources).
- **Conversation thread** — Ask is a running chat, not a one-shot box. `useAsk`
  keeps the message thread and sends the last ~8 turns as `history`, so the
  backend understands short replies ("okay") and follow-ups ("what about food
  there?") in context. A "new chat" button in the header clears the thread.
- **Not yet** — the design's structured, numbered "place cards" need a richer
  `/ask` contract (structured places, not a prose string). Called out in
  `AnswerView.tsx` as a deliberate next step.

## Run

```bash
cd mobile
npm install            # or: npx expo install  (aligns native versions)
cp .env.example .env   # set EXPO_PUBLIC_API_BASE_URL to your backend
npm start              # then press i (iOS), a (Android), or w (web)
```

**Point the app at the backend.** `EXPO_PUBLIC_API_BASE_URL`:
- iOS simulator / web → `http://localhost:8000`
- Android emulator → `http://10.0.2.2:8000`
- Physical device → `http://<your-LAN-ip>:8000` (same Wi-Fi)

Start the backend first (see `../backend/README.md`).

## Map, offline & loading

- **Map tab** (`src/features/map/`) — search + category chips over an
  interactive pinned map with a bottom detail card (rating, Directions, save).
  **Both platforms use Leaflet + OpenStreetMap (no API key):** web via
  react-leaflet (`PlacesMap.web.tsx`), native via Leaflet-in-a-WebView
  (`PlacesMap.tsx`). This is keyless, so the map works in **Expo Go** on
  Android/iOS — unlike `react-native-maps`, whose Android tiles need a Google
  Maps key Expo Go can't provide. Both render real pins and auto-fit to
  results. Places come from the backend
  **`GET /places`** search (Serper Places proxy) via `usePlaces`, so any real
  place is findable — the search box drives the query (debounced), falling back
  to the active category chip ("Walks"/"Food"/"Sights") when empty.
- **Loading** — `Skeleton` primitive + `HomeSkeleton` (design HOME · LOADING);
  the Map tab also shows a skeleton while places load.
- **Offline** — `useNetworkStatus` (NetInfo) drives `OfflineScreen` (design
  OFFLINE · SAVED). Wired into the Ask tab: offline → saved-guide screen with
  "Try to reconnect". Saved items are presentational until offline persistence
  lands.

### Android Maps API key (required for Android only)

`react-native-maps` on Android needs a Google Maps key; iOS uses Apple Maps (no
key). Add to `app.json` before an Android build:

```json
"android": {
  "config": { "googleMaps": { "apiKey": "<YOUR_ANDROID_MAPS_KEY>" } }
}
```

## Contract

The app is typed against the backend's frozen `/ask` contract in
`src/api/types.ts` — keep it in sync with `backend/app/schemas/ask.py` (or
generate from the backend's OpenAPI at `/openapi.json`).

## Auth

No auth in this slice (backend `AUTH_REQUIRED=false`). `apiFetch` already
accepts a bearer `token`; when Supabase auth lands, pass the session JWT
through `askTravelPia(req, { token })` — no other changes needed.
