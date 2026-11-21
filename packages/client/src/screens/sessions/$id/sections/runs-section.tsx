import {
  WorkbenchRuns,
  RunInspector,
  ShellTerminalInspector,
  type SessionRuns,
  type SessionPanels,
  type WorkbenchSection,
} from '#features/sessions';
import type { SessionSection } from './session-section';

export const runTabKey = (name: string): string => `run:${name}`;

export function runSection(
  controls: SessionRuns | undefined,
  key: string,
): SessionSection | undefined {
  const run = controls?.runs.find(({ name }) => runTabKey(name) === key);

  if (!controls || !run) return undefined;

  return {
    key,
    title: run.name,
    icon: 'terminal',
    offered: () => true,
    card: () => ({ summary: null }),
    tab: (_content, tab) => ({
      body: <RunInspector run={run} controls={controls} visible={tab.active} />,
    }),
  };
}

export const shellTabKey = (id: string): string => `terminal:${id}`;

export function shellTerminalSection(
  controls: SessionRuns | undefined,
  key: string,
): SessionSection | undefined {
  const shell = controls?.shells?.find(({ id }) => shellTabKey(id) === key);

  if (!controls || !shell) return undefined;

  return {
    key,
    title: shell.name,
    icon: 'terminal',
    offered: () => true,
    card: () => ({ summary: null }),
    tab: (_content, tab) => ({
      body: (
        <ShellTerminalInspector shell={shell} onClose={() => tab.close?.()}>
          {controls.renderShell?.(shell, tab.active === true)}
        </ShellTerminalInspector>
      ),
    }),
  };
}

export function openNewShell(
  controls: SessionRuns | undefined,
  panels: SessionPanels | undefined,
): (() => void) | undefined {
  const open = controls?.openShell;

  if (!open || !panels) return undefined;

  return () => open(({ id }) => panels.select(shellTabKey(id)));
}

export function runsCard(
  controls: SessionRuns | undefined,
  panels: SessionPanels,
): WorkbenchSection[] {
  if (!controls || (!controls.runs.length && !controls.shells?.length))
    return [];

  return [
    {
      key: 'runs',
      title: 'Runs',
      summary: (
        <WorkbenchRuns
          {...controls}
          onOpen={(name) => panels.select(runTabKey(name))}
          shells={{
            rows: controls.shells ?? [],
            onOpen: (id) => panels.select(shellTabKey(id)),
            onNew: openNewShell(controls, panels),
          }}
        />
      ),
    },
  ];
}
