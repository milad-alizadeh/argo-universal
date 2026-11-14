import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { Stack } from '@repo/kit/primitives/layout/stack';
import type { ReactElement } from 'react';
import { changeName } from './change-identity';
import type { SessionPullRequest } from './session-pull-request';

export interface SessionChangeFilesUnavailableProps {
  // The Change whose files could not be read; the limitation names it and never shows another's files.
  change: SessionPullRequest;
  // Why the files could not be read, as the Plugin said it.
  message: string;
  onRetry: () => void;
}

const muted = (text: string): ReactElement => (
  <Text role="secondary" tone="muted">
    {text}
  </Text>
);

const heading = (
  <Text role="heading" accessibilityRole="heading" aria-level={3}>
    Files unavailable
  </Text>
);

const reasonOf = (change: SessionPullRequest, message: string): string =>
  `The files of ${changeName(change)} could not be loaded: ${message}`;

const notInstead =
  "This Session's Checkout is a different comparison, so its files are not shown instead.";

/*
 * Provisional (the owner reviews it in Storybook; no Paper design exists): the limitation and its retry, built from
 * existing primitives. The Change keeps its identity here, and nothing from the Session's Checkout stands in for its files.
 */
export function SessionChangeFilesUnavailable({
  change,
  message,
  onRetry,
}: SessionChangeFilesUnavailableProps): ReactElement {
  return (
    <Stack direction="column" gap={3}>
      {heading}
      {muted(reasonOf(change, message))}
      {muted(notInstead)}
      <Button size="sm" label="Try again" onPress={onRetry} />
    </Stack>
  );
}
