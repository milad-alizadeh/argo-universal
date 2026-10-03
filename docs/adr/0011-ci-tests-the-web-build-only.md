# CI tests the web build, and mobile is tested only on the developer machine

Mobile CI costs too much for one developer. Playwright runs the full end-to-end suite against the Expo web export on every pull request. One Playwright Electron smoke spec runs only on `main` and release branches, because Electron only wraps the same web build. Maestro runs a few iOS and Android smoke flows on the developer machine only. Vitest covers logic. There is no Jest.

End-to-end tests mock only the Agent CLI, with mock CLIs and recorded sessions in `mocks/cli/<agent>/`. Nothing above that line is mocked.

## Considered Options

- Maestro for every platform. Rejected: Maestro web is beta, runs only in Chromium, cannot drive Electron, and `testID` does not match on web.
