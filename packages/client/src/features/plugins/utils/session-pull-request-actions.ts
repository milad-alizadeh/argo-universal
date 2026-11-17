import type { PageScope } from '@repo/contracts/plugins/page-address';
import type { ScopedRun } from '@repo/contracts/plugins/page-calls';
import type { SessionPullRequest } from '#features/sessions';
import { type FireOperation, toError } from './fire-operation';

// The one Plugin whose PR rows these are: Detach is its Operation, and Core keeps no PR model (ADR-0052).
const githubPluginId = 'github';

export interface RowActionPorts {
  scope: PageScope;
  // The App's fire-and-forget run of an Operation, which says why it failed.
  fire: FireOperation;
  // Says why a copy failed.
  failed: (error: Error) => void;
  copy: (text: string) => Promise<boolean>;
}

const referenceOf = ({
  repository,
  number,
}: SessionPullRequest): string | undefined =>
  repository && `${repository}#${number}`;

function runOperation(
  ports: RowActionPorts,
  operation: string,
  args: ScopedRun['args'],
): void {
  ports.fire({ pluginId: githubPluginId, operation, args, ...ports.scope });
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
      ports.copy(url).catch((cause: unknown) => ports.failed(toError(cause)));
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
