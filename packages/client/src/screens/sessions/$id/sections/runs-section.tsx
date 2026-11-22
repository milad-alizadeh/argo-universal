import { Button } from '@repo/kit/primitives/actions/button';
import {
  WorkbenchRuns,
  type SessionRuns,
  type SessionPanels,
  type WorkbenchSection,
} from '#features/sessions';
import {
  runTabKey,
  shellTabKey,
  TerminalTabBody,
  terminalTabOf,
} from '../session-terminal-tabs';
import type { SessionSection } from './session-section';

export function terminalSection(
  controls: SessionRuns | undefined,
  key: string,
): SessionSection | undefined {
  const terminal = terminalTabOf(controls, key);

  if (!controls || !terminal) return undefined;

  return {
    key,
    title: terminal.title,
    icon: 'terminal',
    offered: () => true,
    card: () => ({ summary: null }),
    tab: (_content, tab) => ({
      body: (
        <TerminalTabBody
          tab={terminal}
          controls={controls}
          visible={tab.active}
          onClose={tab.close}
        />
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

export const createRunFileLabel = 'Create .argo/run.json';

export function runsCard(
  controls: SessionRuns | undefined,
  panels: SessionPanels,
): WorkbenchSection[] {
  if (
    !controls ||
    (!controls.draft && !controls.runs.length && !controls.shells?.length)
  )
    return [];

  return [
    {
      key: 'runs',
      title: 'Runs',
      summary: controls.draft ? (
        <Button
          label={createRunFileLabel}
          onPress={controls.draft.onPress}
          disabled={controls.draft.pending}
          size="sm"
        />
      ) : (
        <WorkbenchRuns
          {...controls}
          onOpen={(name) => panels.select(runTabKey(name))}
          shells={{
            rows: controls.shells ?? [],
            onOpen: ({ id }) => panels.select(shellTabKey(id)),
          }}
        />
      ),
    },
  ];
}
