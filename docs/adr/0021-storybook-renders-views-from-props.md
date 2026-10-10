# Storybook renders views from props; App E2E proves screens

A connected screen is two files (Spec 0011, owner, 2026-10-10). The screen is a thin shell in its feature's `screens/`: it calls tRPC and data hooks and passes their results to the view as props. The view, in the feature's `components/`, takes props only. Storybook renders views from plain props fixtures and callback spies; no story uses a tRPC fixture. App E2E proves each screen is wired, through real journeys against the real Engine with the scripted Agent and the Registry fixture of [ADR-0018](0018-app-e2e-uses-shared-agent-fixtures.md). Rules that hid in screens become named pure functions with unit tests.

This supersedes [ADR-0010](0010-storybook-mocks-data-at-the-trpc-link.md). Its fake tRPC link, subscription publisher, screen preview wrappers and procedure-keyed fixtures restated the Server by hand. They had to follow every contract and Engine change, and a screen story proved only that a screen agreed with that copy. The fake link and the publisher are deleted, so there is no second copy of the Server to keep in step.

It amends [ADR-0009](0009-screens-live-in-the-client-package.md): screens still live in the client package and fetch through `useTRPC()`, and Expo Router route files still only render a screen. Storybook renders views, not screens.

## What carries over from ADR-0010

- Web Storybook is its own app, `apps/storybook` (`@storybook/react-native-web-vite` with the Vitest addon), and CI runs it. On-device Storybook is a dev-only route in `apps/universal-app`. Both read the same stories from `packages/client`.
- Play functions go only in `*.test.stories.tsx`, which the device skips.
- Feed props come from recorded Agent sessions that run through the real converter, never from hand-written rows. Running the converter prepares a Feed story; it does not prove conversion. Projection tests call the public projection with independent expected outputs.

## Rules

- Every view's loading, empty, error and disconnected states are props stories.
- A section screen that embeds a connected screen takes it as a slot; its story passes a view.
- Stories and everything under a feature's `components/` may not import tRPC, TanStack Query, the Connection's tRPC client or a data hook. Data hooks are named `use-*-query` or listed in the lint rule. oxlint enforces this.
- The Storybook harness (preview config, decorators, `each-layout`, `settle-viewport`, `Variations`, `RequestFrame`, theme) is exported as `@repo/client/storybook`, apart from the mock data in `@repo/client/mocks`. A fixture that one story uses lives beside that story.
- The custom Agent screen has no view; its form gets the stories.

## Consequences

Some screen-story claims have no other home and are accepted as lost: refetching Agents after a failed new Session, the whole-row repair after a mismatched append, a catalog change clearing an earlier refresh error, Retry on the load-error alerts (only the callback is proven), and badge counts 1 → 3 → 0.

## Considered Options

- Keep the tRPC fixture link for screens (ADR-0010). Rejected: it is a hand-written second Server that drifts from the contracts and the Engine, and E2E already proves the real wiring.
- MSW through `msw-storybook-addon` and `sb.mock` module mocks stay rejected for ADR-0010's reasons: the first cannot mock tRPC subscriptions on device, and the second does not work with Metro.
