import { Sheet, useSheet } from '@repo/kit/primitives/overlays/sheet';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useEffect, type ReactElement } from 'react';
import { RunTerminal, type SessionRuns } from '#features/sessions';
import { runTabKey } from './sections/runs-section';
import { idleSession } from './session-detail-view.mocks';
import { recordRun, runActions } from './session-run-inspector-fixtures';
import {
  WorkbenchRunList,
  workbenchRunPages,
} from './session-workbench-run-pages';
import { SessionWorkbenchSheet } from './session-workbench-sheet';

type Page = 'before' | 'overview' | 'list' | 'terminal';

const controls = {
  ...runActions,
  renderTerminal: (run, visible): ReactElement => (
    <RunTerminal
      {...{ run }}
      compact
      connected={visible}
      listen={recordRun}
      onInput={(): void => {}}
      onResize={(): void => {}}
    />
  ),
} satisfies SessionRuns;

function JumpToRun(): null {
  const { push } = useSheet();

  useEffect(() => push(runTabKey('web')), [push]);

  return null;
}

function OpenRuns({ page }: { page: Page }): ReactElement {
  return (
    <Sheet
      open
      onOpenChange={(): void => {}}
      label="Workbench"
      detents={['large']}
      contentScrolls
    >
      <Sheet.Screen name="runs" title="Runs">
        <WorkbenchRunList runs={controls} />
        {page === 'terminal' && <JumpToRun />}
      </Sheet.Screen>
      {workbenchRunPages(controls)}
    </Sheet>
  );
}

function PhoneRunsPreview({ page }: { page: Page }): ReactElement {
  if (page === 'overview' || page === 'before')
    return (
      <SessionWorkbenchSheet
        content={{
          ...idleSession,
          runs: page === 'overview' ? controls : undefined,
        }}
        open
        onOpenChange={(): void => {}}
      />
    );

  return <OpenRuns page={page} />;
}

// The fixture sets a sheet destination for each photo; its public view receives ordinary Session props.
const meta = {
  title: 'Screens/Sessions/Session/PhoneRuns',
  tags: ['!autodocs'],
  parameters: { screenPreview: true },
  render: PhoneRunsPreview,
  args: { page: 'overview' },
} satisfies Meta<{ page: Page }>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Workbench: Story = {};

export const WorkbenchBefore: Story = { args: { page: 'before' } };

export const Runs: Story = { args: { page: 'list' } };

export const Terminal: Story = { args: { page: 'terminal' } };
