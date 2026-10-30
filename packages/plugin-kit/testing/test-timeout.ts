/*
 * The one deadline for a test that starts a Plugin host, and for the waits inside it.
 * Measured over 75 Plugin host start waits on a loaded machine: median 36 ms, p95 1893 ms, max 3003 ms.
 * A test starts a host and then mounts and waits on several views, so one test can spend several of those waits;
 * 20 s is about 6.7 times the worst single wait, where the 5 s runner default was under twice the max.
 */
export const pluginTestTimeoutMs = 20_000;
