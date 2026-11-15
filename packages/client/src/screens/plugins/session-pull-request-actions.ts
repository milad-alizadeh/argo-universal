import type { PageScope, ScopedRun } from '@repo/contracts/plugins/page-calls';
import type { SessionPullRequest } from '#features/sessions';

// The one Plugin whose PR rows these are: Detach is its Operation, and Core keeps no PR model (ADR-0052).
const githubPluginId = 'github';

export interface RowActionPorts {
  scope: PageScope;
  // The App's one run of an Operation, which rejects with why it failed.
  run: (run: ScopedRun & { pluginId: string }) => Promise<unknown>;
  failed: (error: Error) => void;
  copy: (text: string) => Promise<void>;
}

const referenceOf = ({
  repository,
  number,
}: SessionPullRequest): string | undefined =>
  repository && `${repository}#${number}`;

const toError = (reason: unknown): Error =>
  reason instanceof Error ? reason : new Error(String(reason));

function detachOf(
  change: SessionPullRequest,
  ports: RowActionPorts,
): Pick<SessionPullRequest, 'onDetach'> {
  const reference = referenceOf(change);

  if (!reference) return {};

  return {
    onDetach: () => {
      ports
        .run({
          pluginId: githubPluginId,
          operation: 'detach',
          args: { reference },
          ...ports.scope,
        })
        .catch((reason: unknown) => ports.failed(toError(reason)));
    },
  };
}

function copyOf(
  { url }: SessionPullRequest,
  ports: RowActionPorts,
): Pick<SessionPullRequest, 'onCopyLink'> {
  if (!url) return {};

  return {
    onCopyLink: () => {
      ports.copy(url).catch((reason: unknown) => ports.failed(toError(reason)));
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
    onSetAutomation: (kind, on) => {
      ports
        .run({
          pluginId: githubPluginId,
          operation: 'automationSet',
          args: { reference, kind, on },
          ...ports.scope,
        })
        .catch((reason: unknown) => ports.failed(toError(reason)));
    },
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
