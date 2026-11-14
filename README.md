# VILATUCK

VILATUCK is a cross-platform social video app starter built with Expo Router and React Native.

## Connected backend
The app is connected to the dedicated VILATUCK Supabase project (not the JUMIE Store project).

- Supabase Auth: email/password sign-up and sign-in
- Profiles: a database trigger creates a profile row when a user account is created
- Video storage: authenticated users can upload videos into their own folder in the `videos` bucket
- Video records: successful uploads create a row in `public.videos`
- Row Level Security: the existing database policies restrict profile, video, follow, like, comment, message, report, notification and bookmark access
- Public media buckets: `avatars`, `videos`, and `thumbnails`

The app uses only the project's publishable key. Never add a Supabase service-role or secret key to this repository or a mobile app.

## Included
- Dark purple VILATUCK interface
- Following / For You / Trending feed tabs
- Video-feed layout with like, comment, gift and share affordances
- Live streaming preview screen
- Creator wallet preview
- Profile and verification information screen
- Supabase email/password sign-up and sign-in
- Video selection, upload to Supabase Storage, and video metadata insert
- Live database-backed For You, Following, and Trending feed tabs
- Video playback, persisted likes, sharing, and comments
- Android and iOS Expo project configuration

## Run locally
1. Install Node.js (LTS).
2. Run `npm install`.
3. Run `npx expo start`.
4. Scan the QR code with Expo Go, or build a native app with EAS Build.

## Important implementation status
The authentication and video-upload code has been connected, but this repository has not yet been built or run on a device in this session. Test account creation, email confirmation, sign-in, and a small video upload before inviting users.

The feed still needs to be connected to load and play videos dynamically. Real live streaming, gifts, ad campaigns, creator balances, identity verification, admin permissions and bank withdrawals require additional secure backend work and trusted providers. The wallet intentionally does not invent earnings or claim withdrawals work.

If Supabase email confirmation is enabled, users must confirm their email before signing in. Configure deep-link handling before adding password-reset or magic-link flows.

Never store payment secrets in the mobile app. Admin privileges and withdrawal approvals must be enforced on the server, not by a client-side PIN.
