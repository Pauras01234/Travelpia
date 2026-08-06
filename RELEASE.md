# TravelPia — Release Guide (Play Store + App Store)

End-to-end steps to ship the Expo/React Native app (`mobile/`) to the Google
Play Store and Apple App Store, plus the backend (`backend/`) it depends on.
Uses **EAS** (Expo Application Services) so you can build **iOS without a Mac**
(cloud builds).

> **Critical path:** the app can't be tested by real users until the backend is
> deployed at a public HTTPS URL, and Google Play requires a **14-day closed
> test** before production. Start both early.

---

## 0. Prerequisites (accounts + tools)

| Need | Cost | Notes |
| --- | --- | --- |
| Expo account | free | `npx expo register` / `eas login` |
| EAS CLI | free | `npm install -g eas-cli` |
| Google Play Developer | **$25 one-time** | play.google.com/console |
| Apple Developer Program | **$99/year** | developer.apple.com |
| A backend host | free tier ok | Render / Railway / Fly / Cloud Run |
| A hosted privacy policy URL | free | required by both stores (app has accounts) |

Install & log in:
```bash
npm install -g eas-cli
eas login
```

---

## 1. Deploy the backend first (public HTTPS)

The mobile build hard-codes the API URL at build time, so the backend must be
live before you build the app.

1. **Pick a host** (Render is simplest for FastAPI). Deploy `backend/`:
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Python 3.11, install `backend/requirements.txt`.
2. **Set environment variables** on the host (NOT committed):
   `OPENAI_API_KEY`, `SERPER_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `LLM_PROVIDER=openai`, `LLM_MODEL=gpt-4o-mini`, `ENVIRONMENT=production`,
   `CORS_ORIGINS=<your web origin(s)>` (only needed for the web build),
   and `AUTH_REQUIRED` per your auth design.
3. **Verify HTTPS:** `https://<your-app>.onrender.com/health` → `{"status":"ok"}`.
   HTTPS is mandatory — iOS/Android release builds block plain `http://`.
4. Note the URL — you'll set it as `EXPO_PUBLIC_API_BASE_URL` for the app build.

---

## 2. Configure the app for production (`mobile/`)

Edit `mobile/app.json`:
- **Identifiers** (already set — keep stable forever): `ios.bundleIdentifier` and
  `android.package` = `com.travelpia.app`.
- **Version** (user-facing): `expo.version` e.g. `"1.0.0"`.
- **Build numbers** (increment every store upload): `ios.buildNumber` (string) and
  `android.versionCode` (integer). EAS can auto-increment (see `eas.json`).
- **App icon + splash**: replace the placeholder with a 1024×1024 icon and splash
  assets; set `icon`, `splash`, and `android.adaptiveIcon`.
- **Permissions**: TravelPia needs none beyond internet — it does **not** use
  device GPS (the map centres on county coordinates), camera, or contacts. Keep
  the permission set empty/minimal; fewer permissions = simpler store review.

Assets to prepare:
- App icon 1024×1024 (no alpha for iOS).
- Feature graphic 1024×500 (Play) + screenshots (phone) for both stores.

---

## 3. Configure EAS builds

From `mobile/`:
```bash
eas build:configure
```
This creates `eas.json`. Use three profiles and inject the **production API URL**
via `EXPO_PUBLIC_API_BASE_URL` so it's baked into the binary:

```jsonc
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "EXPO_PUBLIC_API_BASE_URL": "http://192.168.0.103:8000" }
    },
    "preview": {
      "distribution": "internal",            // APK / TestFlight-style internal
      "android": { "buildType": "apk" },
      "env": { "EXPO_PUBLIC_API_BASE_URL": "https://<your-app>.onrender.com" }
    },
    "production": {
      "autoIncrement": true,                  // bumps build number each build
      "env": { "EXPO_PUBLIC_API_BASE_URL": "https://<your-app>.onrender.com" }
    }
  },
  "submit": { "production": {} }
}
```

> **Do not** ship a build with a `localhost`/LAN URL — that only works in dev
> (Expo Go + tunnel/LAN). Production builds must point at the HTTPS backend.

---

## 4. Signing credentials (EAS handles these)

You don't manage keystores/certs by hand — EAS generates and stores them:
- **Android:** EAS creates an upload keystore on first Android build. **Back it
  up** (`eas credentials`) — losing it complicates future updates.
- **iOS:** EAS creates the distribution certificate + provisioning profile using
  your Apple Developer login on first iOS build.

---

## 5. Android → Google Play

1. **Build the release AAB:**
   ```bash
   eas build --platform android --profile production
   ```
   Produces an `.aab`. (`preview` profile makes an `.apk` for quick device tests.)

2. **Create the app** in the Play Console → fill store listing (title, short +
   full description, screenshots, feature graphic, category = Travel & Local).

3. **Complete required forms:**
   - **Privacy policy URL** (mandatory — app collects email/phone via accounts).
   - **Data safety**: declare that you collect **email, phone, name** (account),
     that data is encrypted in transit, and how it's used. Auth data lives in
     Supabase; AI queries transit your FastAPI → OpenAI/Serper (disclose 3rd-party
     processing). Saved places are stored **on-device** (not collected) currently.
   - **Content rating** questionnaire, **target audience**, **ads** (none).

4. **Closed testing (the 14-day gate):** New/personal developer accounts must run
   a **closed test with ≥12 testers who stay opted-in for ≥14 continuous days**
   before you can request production access.
   ```bash
   eas submit --platform android --profile production   # uploads the AAB
   ```
   Then in Play Console: create a **Closed testing** track, add the 12 testers
   (email list or Google Group), share the opt-in link, and **start the clock**.

5. **Production:** after the 14 days, apply for production access → submit the
   release for review → publish (staged rollout recommended).

---

## 6. iOS → App Store

1. **App Store Connect:** create the app record (same bundle id
   `com.travelpia.app`), pick a name, primary language, category = Travel.

2. **Build:**
   ```bash
   eas build --platform ios --profile production
   ```
   (EAS builds in the cloud — no Mac needed. It'll prompt for your Apple
   Developer login to create/reuse signing credentials.)

3. **Upload to TestFlight:**
   ```bash
   eas submit --platform ios --profile production
   ```
   The build appears in TestFlight after Apple processing (~10–30 min). Add
   internal testers, verify the app works against the production backend.

4. **App Privacy questionnaire** (App Store Connect): declare collected data —
   **email, phone number, name** (Account), linked to identity, used for app
   functionality. Add the **privacy policy URL**.

5. **Submit for review:** fill screenshots (6.7" + 6.5" + 5.5" or the current
   required set), description, keywords, support URL. Submit → Apple review
   (typically ~24–48h). Address any rejection notes, resubmit.

---

## 7. Privacy & compliance (both stores)

Because the app has **user accounts (email/phone/password via Supabase)**:
- Host a **privacy policy** covering: what you collect (email, phone, name),
  where it's stored (Supabase), third parties (OpenAI, Serper, Open-Meteo,
  OpenStreetMap tiles), and how users can delete their account/data.
- **Account deletion**: both stores now require an in-app or documented way to
  delete an account. Plan a "Delete account" path (backend endpoint + UI) — a
  fast-follow if not done by first submission, but Apple/Google increasingly
  enforce it.

---

## 8. After launch

- **OTA JS updates** (no store review) for JS-only changes:
  ```bash
  eas update --branch production
  ```
  (Requires `expo-updates`; native changes still need a new store build.)
- **Version bumps**: raise `expo.version` for user-facing releases; build numbers
  auto-increment via the `production` profile.
- **Crash reporting**: add Sentry (`@sentry/react-native`) before/soon after
  launch — recommended in the architecture's definition-of-done.

---

## 9. TravelPia-specific checklist & gotchas

- [ ] Backend deployed at **HTTPS**; `/health` green; secrets set on the host.
- [ ] `EXPO_PUBLIC_API_BASE_URL` in `eas.json` → the **production HTTPS** URL
      (never localhost/LAN).
- [ ] Supabase project is the **production** project; `AUTH_REQUIRED` set as
      intended; email confirmation re-enabled (the signup handler currently
      auto-confirms for dev — see `backend/app/routers/auth.py` TODO).
- [ ] App icon + splash + screenshots replaced (no placeholders).
- [ ] Privacy policy URL live; Data-safety / App-Privacy forms match reality.
- [ ] **Maps need no Google key** — the app uses Leaflet-in-a-WebView, so there's
      no Google Maps API key to configure. (`react-native-maps` is installed but
      unused; you can remove it from `package.json` for a leaner build.)
- [ ] The WebView map + weather + images all require **internet**; there's an
      offline screen for the no-connection case.
- [ ] Test the **production build** end-to-end (login → Ask → Map → Saved →
      Profile → logout) via `preview` (APK/TestFlight) before submitting.

---

## Fastest path summary

```bash
# 1. deploy backend (Render) → get https URL, set secrets
# 2. put that URL in eas.json (preview + production env)
# 3. from mobile/:
eas login
eas build:configure
eas build -p android --profile preview   # APK to smoke-test on a device
eas build -p android --profile production && eas submit -p android
eas build -p ios --profile production && eas submit -p ios
# 4. Play: closed test (12 testers, 14 days) → production
# 5. App Store: TestFlight → submit for review
```
