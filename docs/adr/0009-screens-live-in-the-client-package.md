# Screens, components, and tRPC hooks live in one client package

`packages/client` holds the UI primitives, the feature components, the connected screens, and the tRPC client setup. Screens fetch their own data through tRPC. Expo Router route files in `apps/universal-app/src/app/` only import and render a screen.

Screens get the tRPC proxy from React context (`useTRPC()`), never from a module-level client, so the App's providers own the one Connection and a Server switch replaces it. Storybook renders views from props, not screens, and App E2E proves the screens ([ADR-0021](0021-storybook-renders-views-from-props.md), amending this paragraph, owner, 2026-10-10).
