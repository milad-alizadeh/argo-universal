import type { PageScope } from '@repo/contracts/plugins/page-address';
import type { ScopedRun } from '@repo/contracts/plugins/page-calls';
import type { SessionPullRequest } from '#features/sessions';
import type { OperationRunner } from './page-calls-ports';

// The one Plugin whose PR rows these are: Detach is its Operation, and Core keeps no PR model (ADR-0052).
const githubPluginId = 'github';

export interface RowActionPorts {
  scope: PageScope;
  // The App's one run of an Operation, which rejects with why it failed.
  run: OperationRunner['run'];
  failed: (error: Error) => void;
  copy: (text: string) => Promise<boolean>;
}

const referenceOf = ({
  repository,
  number,
}: SessionPullRequest): string | undefined =>
  repository && `${repository}#${number}`;

const toError = (cause: unknown): Error =>
  cause instanceof Error ? cause : new Error(String(cause));

const failedWith =
  (ports: RowActionPorts) =>
  (cause: unknown): void =>
    ports.failed(toError(cause));

function runOperation(
  ports: RowActionPorts,
  operation: string,
  args: ScopedRun['args'],
): void {
  ports
    .run({ pluginId: githubPluginId, operation, args, ...ports.scope })
    .catch(failedWith(ports));
}

function detachOf(
  change: SessionPullRequest,
  ports: RowActionPorts,
): Pick<SessionPullRequest, 'onDetach'> {
  const reference = referenceOf(change);

  if (!reference) return {};

  return { onDetach: () => runOperation(ports, 'detach', { reference }) };
}

function copyOf(
  { url }: SessionPullRequest,
  ports: RowActionPorts,
): Pick<SessionPullRequest, 'onCopyLink'> {
  if (!url) return {};

  return {
    onCopyLink: () => {
      ports.copy(url).catch(failedWith(ports));
    },
  };
}

function automationOf(
  change: SessionPullRequest,
  ports: RowActionPorts,
): Pick<SessionPullRequest, 'onSetAutomation'> {
  const reference = referenceOf(change);

  if (!reference || !change.automation) return {};

  return {
    onSetAutomation: (kind, on) =>
      runOperation(ports, 'automationSet', { reference, kind, on }),
  };
}

// The rows with what their … menu does: copy the PR's address, detach it from the Session, and tick an automation.
export const withRowActions = (
  rows: readonly SessionPullRequest[],
  ports: RowActionPorts,
): SessionPullRequest[] =>
  rows.map((change) => ({
    ...change,
    ...copyOf(change, ports),
    ...detachOf(change, ports),
    ...automationOf(change, ports),
  }));
