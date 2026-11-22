import type { RunConfigurationRow } from '@repo/contracts';
import { Sheet, useSheet } from '@repo/kit/primitives/overlays/sheet';
import { showToast } from '@repo/kit/primitives/overlays/toast';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useEffect, useState, type ReactElement } from 'react';
import { runIsActive, RunTerminal, type SessionRuns } from '#features/sessions';
import { partiallyReadyGroup } from '../../../../mocks/run-configurations';
import { idleSession } from './session-detail-view.mocks';
import { draftUnavailable } from './session-phone-runs-fixtures';
import {
  createPhoneRunLog,
  runActions,
} from './session-run-inspector-fixtures';
import { runTabKey } from './session-terminal-tabs';
import {
  WorkbenchRunList,
  workbenchRunPages,
} from './session-workbench-run-pages';
import { SessionWorkbenchSheet } from './session-workbench-sheet';

type Page = 'before' | 'overview' | 'list' | 'group' | 'terminal';

function PhoneRunTerminal({
  run,
  connected,
}: {
  run: RunConfigurationRow;
  connected: boolean;
}): ReactElement {
  const [log] = useState(createPhoneRunLog);

  return (
    <RunTerminal
      {...{ connected, ...log }}
      name={run.name}
      interactive={runIsActive(run)}
      compact
      onResize={(): void => {}}
    />
  );
}

const controls = {
  ...runActions,
  renderTerminal: (run, visible): ReactElement => (
    <PhoneRunTerminal run={run} connected={visible} />
  ),
} satisfies SessionRuns;

const groupControls: SessionRuns = {
  ...controls,
  defaultGroup: {
    status: partiallyReadyGroup,
    onStart: (): void => {},
    onStop: (): void => {},
  },
};

function JumpToRun(): null {
  const { push } = useSheet();

  useEffect(() => push(runTabKey('web')), [push]);

  return null;
}

function OpenRuns({ page }: { page: Page }): ReactElement {
  const shown = page === 'group' ? groupControls : controls;

  return (
    <Sheet
      open
      onOpenChange={(): void => {}}
      label="Workbench"
      detents={['large']}
      contentScrolls
    >
      <Sheet.Screen name="runs" title="Runs" keepsHeaderInset>
        <WorkbenchRunList runs={shown} />
        {page === 'terminal' && <JumpToRun />}
      </Sheet.Screen>
      {workbenchRunPages(shown)}
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
} satisfies Meta<{ page: Page; draftPreview?: typeof draftUnavailable }>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Workbench: Story = {};

export const DraftUnavailable: StoryObj<{
  draftPreview: typeof draftUnavailable;
}> = {
  args: { draftPreview: draftUnavailable },
  render: ({ draftPreview }) => (
    <SessionWorkbenchSheet
      content={{
        ...draftPreview.content,
        runs: {
          ...draftPreview.content.runs,
          draft: {
            pending: false,
            onPress: () =>
              showToast({
                title: 'Runs',
                message: draftPreview.message,
                tone: 'danger',
              }),
          },
        },
      }}
      open
      onOpenChange={(): void => {}}
    />
  ),
};

export const WorkbenchBefore: Story = { args: { page: 'before' } };

export const Runs: Story = { args: { page: 'list' } };

export const DefaultGroup: Story = { args: { page: 'group' } };

export const Terminal: Story = { args: { page: 'terminal' } };
