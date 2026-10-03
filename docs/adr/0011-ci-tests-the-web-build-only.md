# CI tests the web build, and mobile is tested only on the developer machine

Mobile CI costs too much for one developer. Playwright runs the full end-to-end suite against the Expo web export on every pull request. One Playwright Electron smoke spec runs only on `main` and release branches, because Electron only wraps the same web build. Mobile smoke flows on the developer machine are deferred (owner, 2026-10-03); Maestro is the likely tool when they come. Vitest covers logic. There is no Jest.

End-to-end tests mock only the Agent CLI, with mock CLIs and recorded sessions in `mocks/cli/<agent>/`. Nothing above that line is mocked.

## Considered Options

- Maestro for every platform. Rejected: Maestro web is beta, runs only in Chromium, cannot drive Electron, and `testID` does not match on web.
