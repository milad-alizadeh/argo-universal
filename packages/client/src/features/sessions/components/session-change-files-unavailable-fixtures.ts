import type { SessionChangeFilesUnavailableProps } from './session-change-files-unavailable';
import { pullRequestMocks } from './session-pull-request.mocks';

type Fixture = Omit<SessionChangeFilesUnavailableProps, 'onRetry'>;

const change = {
  ...pullRequestMocks.followUp,
  repository: 'owner/app',
  number: 12,
};

// GitHub refused the comparison, so the Change shows why instead of any other files.
export const refusedFiles = {
  change,
  message: 'GitHub answered 502.',
} satisfies Fixture;

// The Account cannot see the PR, which the Plugin says as it learned it.
export const hiddenFiles = {
  change,
  message:
    'owner/app#12 was not found on GitHub, or this account cannot see it.',
} satisfies Fixture;
