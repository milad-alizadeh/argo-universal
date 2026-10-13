// Work the Server does with an Agent process (start, check, sign in, store) can outlast Playwright's 5s default on a loaded runner.
export const agentWork = { timeout: 15_000 };
