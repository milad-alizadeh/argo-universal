import { type ReactElement, useState } from 'react';
import {
  ChangesFiles,
  type ChangesRevision,
  type ChangesSource,
  useChanges,
} from '#features/changes';
import {
  changeKey,
  SessionChangeFilesUnavailable,
  type SessionPullRequest,
} from '#features/sessions';

// Nothing about the Checkout moves a pull request's files, so what is read stays until its own head moves.
const pullRequestRevision: ChangesRevision = {};

type Props = {
  change: SessionPullRequest;
  source: ChangesSource;
  onRetry: () => void;
};

function ChangeFilesRead({ change, source, onRetry }: Props): ReactElement {
  const view = useChanges(
    { sessionId: changeKey(change), open: true, revision: pullRequestRevision },
    source,
  );

  if (view.loadError && !view.files)
    return (
      <SessionChangeFilesUnavailable
        change={change}
        message={view.loadError}
        onRetry={onRetry}
      />
    );

  return <ChangesFiles {...view} />;
}

/*
 * The files of the selected Change, read against its own repository, base and head and never the Checkout's (ADR-0052).
 * One that cannot be read says so, with a retry that reads them again; a Change starts over with its own read.
 */
export function SessionChangeFiles(
  props: Omit<Props, 'onRetry'>,
): ReactElement {
  const [attempt, setAttempt] = useState(0);

  return (
    <ChangeFilesRead
      key={`${changeKey(props.change)}:${attempt}`}
      {...props}
      onRetry={() => setAttempt((last) => last + 1)}
    />
  );
}
