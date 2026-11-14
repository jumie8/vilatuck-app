# VILATUCK

VILATUCK is a cross-platform social video app starter built with Expo Router and React Native.

## Included in this first build
- Dark purple VILATUCK interface
- Following / For You / Trending feed tabs
- Video-feed layout with like, comment, gift and share affordances
- Live streaming preview screen
- Creator wallet preview
- Profile and verification information screen
- Video selection from the phone gallery and caption entry screen (publishing awaits backend connection)
- Android and iOS Expo project configuration

## Run locally
1. Install Node.js (LTS).
2. Run `npm install`.
3. Run `npx expo start`.
4. Scan the QR code with Expo Go, or build a native app with EAS Build.

## Important implementation status
This commit is the front-end starter, not a production social network. Video uploads/playback, real live streaming, gifts, ad campaigns, creator balances, identity verification, admin permissions and bank withdrawals require a secure backend and trusted providers. The wallet intentionally does not invent earnings or claim that withdrawals work. Connect authentication, database, storage, moderation and payment verification before enabling money features.

Never store payment secrets in the mobile app. Admin privileges and withdrawal approvals must be enforced on the server, not by a client-side PIN.
