import {
  WorkbenchRuns,
  RunInspector,
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
