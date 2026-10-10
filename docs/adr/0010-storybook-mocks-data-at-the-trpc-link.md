# Storybook mocks data with a tRPC link, not at the network

Superseded by [ADR-0021](0021-storybook-renders-views-from-props.md) (Spec 0011, owner, 2026-10-10): Storybook renders views from props, and no story uses a tRPC fixture. The Feed fixture rule carries over into ADR-0021: Feed fixtures come from recorded Agent sessions that run through the real converter, never from hand-written rows. The text below is kept as history.

Web Storybook is its own app, `apps/storybook` (`@storybook/react-native-web-vite` with the Vitest addon), and CI runs it. On-device Storybook is a dev-only route in `apps/universal-app` that you also open from the Expo dev menu. Both read the same stories from `packages/client`. Play functions go only in `*.test.stories.tsx`, which the device skips.

A story decorator builds a tRPC client whose custom link returns typed fixtures for each procedure, keyed by procedure path. This follows Storybook's "mocking providers" pattern, and it works the same on web and on device. Only screens get tRPC fixtures. Feed fixtures come from recorded vendor sessions that run through the real converter, never from hand-written rows.

Under the [testing seam rule](../agents/testing-seams.md), a Feed story renders the actual Feed after explicit fixture preparation through the real converter. Required context and layout may wrap it; a separate feature preview component solely to prepare and forward those props is unnecessary. Presentation coverage proves visible behaviour, while projection tests use independent expected outputs at the public projection function. Running the converter for presentation setup does not itself prove that conversion is correct (owner, 2026-10-09).

## Considered Options

- MSW through `msw-storybook-addon`. Rejected: its React Native package is an experiment that fails its own tests, and it cannot mock tRPC subscriptions on device.
- `sb.mock` module mocks. Rejected: they work only with Vite and Webpack, not with Metro.
