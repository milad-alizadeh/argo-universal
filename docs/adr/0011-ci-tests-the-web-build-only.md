# CI tests the web build, and mobile is tested only on the developer machine

Mobile CI costs too much for one developer. Playwright runs the full end-to-end suite against the Expo web export on every pull request. One Playwright Electron smoke spec runs only on `main` and release branches, because Electron only wraps the same web build. Mobile smoke flows on the developer machine are deferred (owner, 2026-10-03); Maestro is the likely tool when they come. Vitest covers logic. There is no Jest.

The original CLI-only E2E boundary is superseded by [ADR-0018](0018-app-e2e-uses-shared-agent-fixtures.md). [Testing seams](../agents/testing-seams.md) defines the surfaces each suite proves; the external fixture exception does not establish compatibility with a running upstream Agent. Provider translation unit tests exercise real pure mappings with official typed fixtures.

## Considered Options

- Maestro for every platform. Rejected: Maestro web is beta, runs only in Chromium, cannot drive Electron, and `testID` does not match on web.
