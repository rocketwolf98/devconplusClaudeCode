# Member App — Vite Migration Design

> Date: 2026-02-27
> Decision: Migrate `apps/member` from React Native (Expo) to React + Vite (Option A — Big Bang)
> Reason: App is PWA-only (no App Store), only needed during events, teammates need plain `npm install`

---

## Decision

No App Store deployment. The app is accessed via URL during events. A PWA built with Vite is the right tool — same stack as the organizer, same `npm install`, same Vercel deployment pattern.

---

## Architecture

| Concern | Old (Expo) | New (Vite) |
|---|---|---|
| Bundler | Metro | Vite |
| Router | Expo Router v3 (file-based) | React Router v6 |
| Styling | NativeWind v4 | Tailwind CSS v3 |
| Components | React Native primitives | HTML + Tailwind |
| QR display | react-native-qrcode-svg | qrcode.react |
| Navigation hook | useRouter() from expo-router | useNavigate() from react-router-dom |
| Zustand stores | browser-incompatible peer deps | unchanged — already browser-compatible |
| Shared mock data | @devcon-plus/supabase | unchanged |

---

## Folder Structure

```
apps/member/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── vercel.json                    (keep existing)
├── public/
│   └── manifest.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── router.tsx
│   ├── index.css
│   ├── components/
│   │   ├── MemberLayout.tsx
│   │   ├── ComingSoonModal.tsx
│   │   ├── EventCard.tsx
│   │   ├── JobCard.tsx
│   │   ├── NewsCard.tsx
│   │   ├── PromotedBadge.tsx
│   │   ├── StatusPill.tsx
│   │   ├── TransactionRow.tsx
│   │   ├── XPCard.tsx
│   │   └── ChipBar.tsx
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── Onboarding.tsx
│   │   │   ├── SignIn.tsx
│   │   │   └── SignUp.tsx
│   │   ├── dashboard/
│   │   │   └── Dashboard.tsx
│   │   ├── events/
│   │   │   ├── EventsList.tsx
│   │   │   ├── EventDetail.tsx
│   │   │   ├── EventRegister.tsx
│   │   │   ├── EventPending.tsx
│   │   │   └── EventTicket.tsx
│   │   ├── jobs/
│   │   │   ├── JobsList.tsx
│   │   │   └── JobDetail.tsx
│   │   ├── points/
│   │   │   ├── Points.tsx
│   │   │   └── PointsHistory.tsx
│   │   ├── rewards/
│   │   │   └── Rewards.tsx
│   │   └── profile/
│   │       ├── Profile.tsx
│   │       ├── ProfileEdit.tsx
│   │       ├── Notifications.tsx
│   │       └── Privacy.tsx
│   └── stores/
│       ├── useAuthStore.ts
│       ├── useEventsStore.ts
│       ├── useJobsStore.ts
│       └── usePointsStore.ts
```

---

## Routing

Auth routes render without tab nav. All other routes render inside `MemberLayout`.

| Expo Router (old) | React Router v6 (new) |
|---|---|
| `(auth)/onboarding` | `/onboarding` |
| `(auth)/sign-in` | `/sign-in` |
| `(auth)/sign-up` | `/sign-up` |
| `(tabs)/index` | `/` |
| `(tabs)/events/index` | `/events` |
| `(tabs)/events/[id]` | `/events/:id` |
| `(tabs)/events/[id]/register` | `/events/:id/register` |
| `(tabs)/events/[id]/pending` | `/events/:id/pending` |
| `(tabs)/events/[id]/ticket` | `/events/:id/ticket` |
| `(tabs)/jobs/index` | `/jobs` |
| `(tabs)/jobs/[id]` | `/jobs/:id` |
| `(tabs)/points/index` | `/points` |
| `(tabs)/points/history` | `/points/history` |
| `(tabs)/rewards/index` | `/rewards` |
| `(tabs)/profile/index` | `/profile` |
| `(tabs)/profile/edit` | `/profile/edit` |
| `(tabs)/profile/notifications` | `/profile/notifications` |
| `(tabs)/profile/privacy` | `/profile/privacy` |

---

## MemberLayout — Bottom Nav

5-tab nav, independent from organizer. Center button is Dashboard (hero).

```
[ Events ]  [ Jobs ]  [ ● ]  [ Points ]  [ Profile ]
                       ↑
                  Dashboard
               (elevated circle)
```

| Index | Route | Icon | Label |
|---|---|---|---|
| 0 | `/events` | 🎟️ | Events |
| 1 | `/jobs` | 💼 | Jobs |
| 2 | `/` | — | Center hero |
| 3 | `/points` | ⭐ | Points |
| 4 | `/profile` | 👤 | Profile |

---

## Component Migration Map

| React Native | HTML + Tailwind |
|---|---|
| `<View>` | `<div>` |
| `<Text>` | `<p>`, `<span>`, `<h1>` etc. |
| `<TouchableOpacity onPress={fn}>` | `<button onClick={fn}>` |
| `<ScrollView>` | `<div className="overflow-y-auto">` |
| `<FlatList data={x} renderItem={fn}>` | `{x.map(item => fn(item))}` |
| `<SafeAreaView>` | CSS `env(safe-area-inset-*)` in MemberLayout |
| `StyleSheet.create({...})` | Tailwind classes |
| `useRouter().push('/path')` | `useNavigate()('/path')` |
| `useRouter().back()` | `useNavigate()(-1)` |
| `<Image source={{uri}}>` | `<img src={uri}>` |
| `react-native-qrcode-svg` | `qrcode.react` (`<QRCodeSVG>`) |

---

## What Stays Unchanged

- `packages/supabase/` — shared types and mock data, no changes
- `apps/member/vercel.json` — update build command to `npm run build`
- All Zustand stores — move to `src/stores/`, logic unchanged
- `apps/organizer/` — completely untouched
- `apps/landing/` — completely untouched
- Root `package.json`, `turbo.json` — unchanged
