import type { ChangeAutomationKind } from '@repo/contracts';
import type { PageScope } from '@repo/contracts/plugins/page-address';
import type { ScopedRun } from '@repo/contracts/plugins/page-calls';
import type { SessionPullRequest } from '#features/sessions';
import {
  type FireOperation,
  type OperationSettled,
  toError,
} from './fire-operation';

// The one Plugin whose PR rows these are: Detach is its Operation, and Core keeps no PR model (ADR-0052).
const githubPluginId = 'github';

// One tick made in a row's menu: the PR, the automation, and whether it was turned on or off.
export type AutomationTick = {
  reference: string;
  kind: ChangeAutomationKind;
  on: boolean;
};

export interface RowActionPorts {
  scope: PageScope;
  // The App's fire-and-forget run of an Operation, which says why it failed.
  fire: FireOperation;
  // Says why a copy failed.
  failed: (error: Error) => void;
  copy: (text: string) => Promise<boolean>;
  // Shows a tick from the press; what it returns is told whether the tick's Operation answered or failed.
  hold: (tick: AutomationTick) => OperationSettled;
}

export const referenceOf = ({
  repository,
  number,
}: SessionPullRequest): string | undefined =>
  repository && `${repository}#${number}`;

const scopedOf = (
  ports: RowActionPorts,
  operation: string,
  args: ScopedRun['args'],
): Parameters<FireOperation>[0] => ({
  pluginId: githubPluginId,
  operation,
  args,
  ...ports.scope,
});

function runOperation(
  ports: RowActionPorts,
  operation: string,
  args: ScopedRun['args'],
): void {
  ports.fire(scopedOf(ports, operation, args));
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

/*
 * A tick shows from the press and is taken back when its Operation fails: Auto-merge asks GitHub before it answers,
 * and a menu that waited on that looked as though the press had missed (owner, 2026-11-18).
 */
function setAutomation(ports: RowActionPorts, tick: AutomationTick): void {
  ports.fire(scopedOf(ports, 'automationSet', tick), ports.hold(tick));
}

function automationOf(
  change: SessionPullRequest,
  ports: RowActionPorts,
): Pick<SessionPullRequest, 'onSetAutomation'> {
  const reference = referenceOf(change);

  if (!reference || !change.automation) return {};

  return {
    onSetAutomation: (kind, on) =>
      setAutomation(ports, { reference, kind, on }),
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
