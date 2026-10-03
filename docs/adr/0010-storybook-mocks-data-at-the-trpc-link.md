# Storybook mocks data with a tRPC link, not at the network

Web Storybook is its own app, `apps/storybook` (`@storybook/react-native-web-vite` with the Vitest addon), and CI runs it. On-device Storybook is a dev-only route in `apps/universal-app` that you also open from the Expo dev menu. Both read the same stories from `packages/client`. Play functions go only in `*.test.stories.tsx`, which the device skips.

A story decorator builds a tRPC client whose custom link returns typed fixtures for each procedure, keyed by procedure path. This follows Storybook's "mocking providers" pattern, and it works the same on web and on device. Only screens get tRPC fixtures. Feed fixtures come from recorded vendor sessions that run through the real converter, never from hand-written rows.

## Considered Options

- MSW through `msw-storybook-addon`. Rejected: its React Native package is an experiment that fails its own tests, and it cannot mock tRPC subscriptions on device.
- `sb.mock` module mocks. Rejected: they work only with Vite and Webpack, not with Metro.
