import type { CalloutLoadingProps, LaunchCalloutProps } from './launch-callout';

// A story supplies Retry; a fixture is how the Agent stopped.
type LaunchCalloutFixture = Omit<LaunchCalloutProps, 'onRetry'>;

const exited = `Agent exited with status 1
npm error code E404
npm error 404 Not Found - GET https://registry.npmjs.org/@zed-industries%2fcodex-acp
npm error 404 '@zed-industries/codex-acp@0.3.9' is not in this registry.`;

export const failedLaunch = { message: exited } satisfies LaunchCalloutFixture;

export const failedLaunchWithoutOutput = {
  message: 'Agent exited with status 1',
} satisfies LaunchCalloutFixture;

export const installing = {
  title: 'Installing…',
  progress: 0.48,
} satisfies CalloutLoadingProps;

export const installingWithoutTotal = {
  title: 'Installing…',
  progress: null,
} satisfies CalloutLoadingProps;

export const loadingConfiguration = {
  title: 'Loading configuration…',
} satisfies CalloutLoadingProps;

export const loading = {} satisfies CalloutLoadingProps;
