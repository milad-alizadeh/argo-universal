# One Expo app for every platform, and Electron only wraps it

Argo runs on iOS, Android, web, and macOS, and one solo developer maintains it. We build one Expo app (Expo Router, React Native Web, Uniwind, Argo's primitives ([ADR-0020](0020-argo-owns-its-primitives.md))) for iOS, Android, and web. The desktop app is an Electron shell that loads the Expo web export. Desktop has no UI of its own.

The repository is a pnpm workspace with catalogs and Turborepo, in the layout of create-t3-turbo. Catalogs hold every shared version, and `sherif` fails the install when two `package.json` files disagree. oxlint does lint and oxfmt does format (ADR-0017), and `tsc` does type checks.

## Considered Options

- A separate desktop UI (Argo's current Vite and shadcn renderer). Rejected: two UIs to keep equal.
- bun as the package manager (Argo's current choice). Rejected: Metro works best with pnpm in a monorepo, and the Server and Electron run on Node. bun is not used.
