import type { RunConfigurationRow } from '@repo/contracts';
import type { ReactNode } from 'react';
import type { SessionPanels, WorkbenchSection } from '#features/sessions';
import {
  WorkbenchRuns,
  type WorkbenchRunsProps,
} from '../../../../features/sessions/components/session-workbench-runs';
import { RunInspector } from '../session-run-inspector';
import type { SessionSection } from './session-section';

export type SessionRuns = Omit<WorkbenchRunsProps, 'onOpen'> & {
  onRestart: (name: string) => void;
  renderTerminal: (run: RunConfigurationRow) => ReactNode;
};

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
    tab: () => ({ body: <RunInspector run={run} controls={controls} /> }),
  };
}

export function runsCard(
  controls: SessionRuns | undefined,
  panels: SessionPanels,
): WorkbenchSection[] {
  if (!controls?.runs.length) return [];

  return [
    {
      key: 'runs',
      title: 'Runs',
      summary: (
        <WorkbenchRuns
          {...controls}
          onOpen={(name) => panels.select(runTabKey(name))}
        />
      ),
    },
  ];
}
