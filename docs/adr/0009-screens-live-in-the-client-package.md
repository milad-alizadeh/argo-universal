# Screens, components, and tRPC hooks live in one client package

`packages/client` holds the UI primitives, the feature components, the connected screens, and the tRPC client setup. Screens fetch their own data through tRPC. Expo Router route files in `apps/universal-app/src/app/` only import and render a screen.

A separate web Storybook app and the on-device Storybook can then render every screen without the Expo Router tree. Screens get the tRPC proxy from React context (`useTRPC()`), never from a module-level client, so that a story can replace it.
