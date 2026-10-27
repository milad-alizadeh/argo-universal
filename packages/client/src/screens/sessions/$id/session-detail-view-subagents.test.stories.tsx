import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import {
  meta as sessionDetailViewTestMeta,
  type Story,
} from '../../../../mocks/session-view/session-view-story.test.mocks';
import {
  subagentNow,
  subagentStates,
} from '../../../features/sessions/components/subagent-list/subagent-list.mocks';
import type { SessionDetailViewProps } from './session-detail-view';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { runningSession } from './session-detail-view.mocks';

const subagentsName = 'Agents';

const agentsOverview = 'Open Agents overview';

const selected = ['aria-selected', 'true'] as const;

const triggerName = (wide: boolean, count: number): string =>
  wide ? agentsOverview : `Agents: ${count}`;

const meta = {
  ...sessionDetailViewTestMeta,
  title: 'Tests/Screens/Sessions/Session/Subagents',
  render: ({ view }): JSX.Element => <FramedSessionPreview {...view} />,
} satisfies Meta<{ view: SessionDetailViewProps }>;

export default meta;

type State = keyof typeof subagentStates;

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

type Interaction = Pick<PlayContext, 'canvas' | 'userEvent'>;

async function assertPresentation(
  { canvas, userEvent }: Interaction,
  wide: boolean,
  count: number,
): Promise<void> {
  const page = within(document.body);

  if (wide) {
    const tab = await canvas.findByRole('tab', { name: /^Agents:/ });
    await expect(tab).toHaveAttribute(...selected);
    await expect(within(tab).getByText(String(count))).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Toggle Workbench' }),
    );
    await userEvent.click(canvas.getByRole('button', { name: agentsOverview }));
    await expect(tab).toHaveAttribute(...selected);
    await expect(page.queryByRole('dialog')).not.toBeInTheDocument();

    return;
  }

  await waitFor(() =>
    expect(page.getByRole('dialog', { name: subagentsName })).toBeVisible(),
  );
  await expect(
    canvas.queryByRole('button', { name: subagentsName }),
  ).not.toBeInTheDocument();
  await expect(page.queryByRole('tab')).not.toBeInTheDocument();
}

async function subagentsPage(
  canvas: Interaction['canvas'],
  wide: boolean,
): Promise<ReturnType<typeof within>> {
  const host = wide
    ? await canvas.findByRole('tabpanel', { name: 'Agents' })
    : await within(document.body).findByRole('dialog', { name: subagentsName });

  return within(host);
}

// The same props contract at both presentations: header/Inspector wide, Composer/Sheet below wide.
function subagentsAt(width: number, state: State): Story {
  const subagents = subagentStates[state];
  const onSelect = fn();
  const wide = width === layoutWidths.wide;
  const absentTrigger = wide ? agentsOverview : /^Subagents/;

  return {
    beforeEach: () => settleViewport(width),
    args: {
      view: {
        state: 'open',
        ...runningSession,
        subagents: { subagents, onSelect, now: subagentNow },
      },
    },
    play: async ({ canvas, userEvent }) => {
      await expect(
        canvas.queryByRole('button', { name: 'Shells' }),
      ).not.toBeInTheDocument();
      await expect(
        canvas.queryByRole('tab', { name: /^Agents:/ }),
      ).not.toBeInTheDocument();

      if (!subagents.length) {
        await expect(
          canvas.queryByRole('button', {
            name: absentTrigger,
          }),
        ).not.toBeInTheDocument();

        return;
      }

      const trigger = triggerName(wide, subagents.length);

      await userEvent.click(
        await canvas.findByRole('button', { name: trigger }),
      );

      const page = await subagentsPage(canvas, wide);

      for (const item of subagents) {
        await waitFor(() => expect(page.getByText(item.title)).toBeVisible());
      }

      await assertPresentation({ canvas, userEvent }, wide, subagents.length);
    },
  };
}

export const WideNone = subagentsAt(layoutWidths.wide, 'none');

export const WideOneRunning = subagentsAt(layoutWidths.wide, 'oneRunning');

export const WideSeveralMixed = subagentsAt(layoutWidths.wide, 'severalMixed');

export const WideAllFinished = subagentsAt(layoutWidths.wide, 'allFinished');

export const MediumNone = subagentsAt(layoutWidths.tablet, 'none');

export const MediumOneRunning = subagentsAt(layoutWidths.tablet, 'oneRunning');

export const MediumSeveralMixed = subagentsAt(
  layoutWidths.tablet,
  'severalMixed',
);

export const MediumAllFinished = subagentsAt(
  layoutWidths.tablet,
  'allFinished',
);

export const PhoneSubagentsOpenSheet = subagentsAt(
  layoutWidths.phone,
  'severalMixed',
);
