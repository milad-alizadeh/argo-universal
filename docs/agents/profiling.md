# Profiling

Look at which components render and why. Those counts stay the same on a busy machine; timings don't, so read timings only from a profiling build, and never a dev one.

## Profile the App on web

1. Start a Server with a seed tier. It prints its URL and runs until stopped. `PERF_FEED_ROWS` is 100, 1000 or 10000; `PERF_SESSIONS` is 100, 241 or 1000.

   ```sh
   PERF_FEED_ROWS=1000 PERF_SESSIONS=100 pnpm --filter @repo/tools perf:seed
   ```

2. Build for that URL, then serve the build. `build:profiling` uses `react-dom/profiling`, the one production React whose Profiler reports timings, and leaves names unminified so components are readable.

   ```sh
   EXPO_PUBLIC_ARGO_SERVER_URL=<url> pnpm --filter @repo/universal-app build:profiling
   pnpm --filter @repo/universal-app exec expo serve
   ```

3. Record in the React DevTools Profiler with "Record why each component rendered" on. Chrome's Performance panel shows the React tracks beside layout and paint.

A static dev export doesn't work here: its page stays empty.

## Profile on iOS and Android

Use React Native DevTools on a real build. Nobody has done this on this repo yet: #1844 tracks it, so update this section with what it finds.

## Stop a fix regressing

Add a test with `renderCounter` from `packages/kit/mocks/render-counts.ts` in the component's `.test.stories.tsx`, and see it fail on a deliberate regression. It says which components rendered, and which props changed. `feed-streaming-renders.test.stories.tsx` and `list-grouping.test.stories.tsx` are the examples.

Storybook doesn't run React Compiler and the App does, so a story can count more renders than the App. A count a story requires, the App also meets. Check a surprising count against the App before filing it.

Build a story's view the way the App builds it. A Feed story that skips `keepUnchangedItems` reports every row updating, which the App doesn't do.
