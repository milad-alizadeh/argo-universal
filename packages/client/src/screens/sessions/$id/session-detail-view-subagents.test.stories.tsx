import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { Button } from '@repo/kit/primitives/actions/button';
import { RetainedPageVisibility } from '@repo/kit/use-shown-page';
import type { Meta } from '@storybook/react-native-web-vite';
import { useState, type JSX } from 'react';
import { expect, fireEvent, fn, waitFor, within } from 'storybook/test';
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

const agentsCard = 'workbench-subagents';

const cardRow = /^(Open (?!.*overview)|Show )/;

const selected = ['aria-selected', 'true'] as const;

// Wide, a card row (or its "done" footer, with none running) opens the Agents tab; below wide the Composer's pill opens the list.
async function openList(
  { canvas, userEvent }: Interaction,
  wide: boolean,
  count: number,
): Promise<void> {
  if (!wide) {
    await userEvent.click(
      await canvas.findByRole('button', { name: `Agents: ${count}` }),
    );

    return;
  }

  const card = within(await canvas.findByTestId(agentsCard));
  const [row] = card.getAllByRole('button', { name: cardRow });

  await userEvent.click(row ?? card.getByRole('button'));
}

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
    const card = within(canvas.getByTestId(agentsCard));
    const [row] = card.getAllByRole('button', { name: cardRow });

    await userEvent.click(row ?? card.getByRole('button'));
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

  return {
    beforeEach: () => settleLayout(width),
    args: {
      view: {
        state: 'open',
        ...runningSession,
        subagents: { subagents, onSelect, now: subagentNow },
      },
    },
    play: async ({ canvas, userEvent }) => {
      await expect(
        canvas.queryByRole('button', { name: 'Background Tasks' }),
      ).not.toBeInTheDocument();
      await expect(
        canvas.queryByRole('tab', { name: /^Agents:/ }),
      ).not.toBeInTheDocument();

      if (!subagents.length) {
        await expect(canvas.queryByTestId(agentsCard)).not.toBeInTheDocument();

        return;
      }

      await openList({ canvas, userEvent }, wide, subagents.length);

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

function PhoneSessionFocus(): JSX.Element {
  const [focused, setFocused] = useState(true);

  return (
    <>
      <Button
        label="Switch Session"
        onPress={() => setFocused((value) => !value)}
      />
      <RetainedPageVisibility value={focused}>
        <FramedSessionPreview
          state="open"
          {...runningSession}
          subagents={{
            subagents: subagentStates.oneRunning,
            onSelect: fn(),
            now: subagentNow,
          }}
        />
      </RetainedPageVisibility>
    </>
  );
}

export const PhoneSheetDismissesOnSwitch: Story = {
  render: () => <PhoneSessionFocus />,
  beforeEach: () => settleLayout(layoutWidths.phone),
  play: async ({ canvas, userEvent }) => {
    const body = within(document.body);
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Agents: 1' }),
    );
    await expect(
      await body.findByRole('dialog', { name: subagentsName }),
    ).toBeVisible();
    fireEvent.click(
      canvas.getByRole('button', { name: 'Switch Session', hidden: true }),
    );
    await waitFor(() =>
      expect(
        body.queryByRole('dialog', { name: subagentsName }),
      ).not.toBeInTheDocument(),
    );
    fireEvent.click(canvas.getByRole('button', { name: 'Switch Session' }));
    await expect(
      body.queryByRole('dialog', { name: subagentsName }),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Agents: 1' }));
    await expect(
      await body.findByRole('dialog', { name: subagentsName }),
    ).toBeVisible();
  },
};
