import type { SessionPullRequest } from '#features/sessions';

// A PR is named by its repository plus number, never by number alone, so two repositories never collide.
export const referenceOfChange = ({
  repository,
  number,
}: Pick<SessionPullRequest, 'repository' | 'number'>): string =>
  repository ? `${repository}#${number}` : String(number);
