import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import {
  type MockInstance,
  expect,
  screen,
  spyOn,
  within,
  waitFor,
} from 'storybook/test';
import { pullRequestMocks } from '../../../features/sessions/components/session-pull-request.mocks';
import type { SessionDetailViewProps } from './session-detail-view';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import {
  severalPullRequests,
  withPullRequests,
} from './session-detail-view-pull-request.mocks';
import { idleSession } from './session-detail-view.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/WorkbenchChanges',
  parameters: { screenPreview: true },
  args: {
    view: {
      state: 'open',
      ...withPullRequests(idleSession, severalPullRequests),
    },
  },
  render: ({ view }): ReactElement => <FramedSessionPreview {...view} />,
  beforeEach: (): Promise<void> => settleLayout(1920),
} satisfies Meta<{ view: SessionDetailViewProps }>;

export default meta;

type Story = StoryObj<typeof meta>;

// The Inspector's own glyph label for the same Change.
const stageLabel = 'Open Change #45';

const firstChange = { name: 'Open files of Change #45' };

const { title: firstTitle, checks: firstPullRequestChecks } =
  pullRequestMocks.checksRunning;

const firstChecks = firstPullRequestChecks.details;

type Context = Parameters<NonNullable<Story['play']>>[0];

async function expectPrDetails({
  canvas,
}: Pick<Context, 'canvas'>): Promise<void> {
  const panel = within(canvas.getByRole('tabpanel', { name: 'Changes' }));

  await expect(await panel.findByLabelText(stageLabel)).toBeVisible();
}

let consoleErrors: MockInstance<typeof console.error>;

export const BoundedPreview: Story = {
  beforeEach: () => {
    consoleErrors = spyOn(console, 'error');

    return (): void => consoleErrors.mockRestore();
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', firstChange)).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Open files of Change #44' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Open files of Change #43' }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Open files of Change #46' }),
    ).toBeNull();
    await expect(
      canvas.queryByRole('button', { name: 'Open files of Change #42' }),
    ).toBeNull();
    await expect(
      canvas.getByText('1 more open, 1 merged, 1 closed'),
    ).toBeVisible();
    await expect(
      canvas.getByLabelText('CI Checks 3/5, 2 running'),
    ).toBeVisible();
    await expect(
      canvas.getByLabelText('CI Checks 4/5, 1 failing'),
    ).toBeVisible();
    await expect(canvas.getByLabelText('CI Checks 5/5, passed')).toBeVisible();
    await expect(
      consoleErrors.mock.calls
        .flat()
        .filter(
          (part) =>
            typeof part === 'string' &&
            part.includes('A props object containing a "key" prop'),
        ),
    ).toEqual([]);
  },
};

export const DisclosureKeepsInspectorClosed: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Collapse Changes' }),
    );
    await waitFor(() =>
      expect(canvas.queryByRole('button', firstChange)).toBeNull(),
    );
    await expect(canvas.queryByRole('tab', { name: 'Changes' })).toBeNull();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Expand Changes' }),
    );
    await expect(canvas.getByRole('button', firstChange)).toBeVisible();
  },
};

export const MenuOpensStage: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Change #45 actions' }),
    );
    await expect(canvas.queryByRole('tab', { name: 'Changes' })).toBeNull();
    await userEvent.click(
      await screen.findByRole('menuitem', {
        name: 'Open Changes in Inspector',
      }),
    );
    await expectPrDetails({ canvas });
  },
};

export const RemainderOpensStage: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', {
        name: '1 more open, 1 merged, 1 closed',
      }),
    );
    await expectPrDetails({ canvas });
  },
};

export const FilesOpenStage: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', firstChange));
    await expectPrDetails({ canvas });
  },
};

// The row is not a control: the title is plain text, and only its parts press.
export const RowIsNotPressable: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByText(firstTitle));
    await expect(canvas.queryByRole('tab', { name: 'Changes' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: firstTitle })).toBeNull();
  },
};

export const ChecksPopoverListsEachCheck: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: /CI Checks 3\/5/ }),
    );
    const popover = await screen.findByRole('dialog', { name: 'CI Checks' });

    for (const { name } of firstChecks) {
      await waitFor(() =>
        expect(within(popover).getByText(name)).toBeVisible(),
      );
    }

    await expect(canvas.queryByRole('tab', { name: 'Changes' })).toBeNull();
  },
};

export const PreviewRestoresPrDetails: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', firstChange));
    await expectPrDetails({ canvas });
    await userEvent.click(canvas.getByRole('button', { name: 'Files' }));
    await userEvent.click(canvas.getByRole('button', firstChange));
    await expectPrDetails({ canvas });
  },
};
