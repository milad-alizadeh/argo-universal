import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type JSX, useState } from 'react';
import { View } from 'react-native';
import { expect, fn, screen, waitFor } from 'storybook/test';
import { type SessionPullRequest, useSessionPanels } from '#features/sessions';
import { repositoryChanges } from '../../../features/sessions/components/session-pull-request.mocks';
import { SessionInspector } from './session-inspector';

const attach = fn<(reference: string) => Promise<boolean>>(() =>
  Promise.resolve(true),
);

const detach = fn<(change: SessionPullRequest) => Promise<boolean>>(() =>
  Promise.resolve(true),
);

const header = {
  title: 'Work',
  status: 'idle',
  startedAt: null,
} as const;

// The Session's Inspector with its Changes tab shown, as the sheet on a phone.
function PhoneSheet(): JSX.Element {
  const panels = useSessionPanels(['changes']);
  const [shown, setShown] = useState(false);

  if (!shown) {
    panels.select('changes');
    setShown(true);
  }

  return (
    <View className="h-175 w-full flex-row">
      <SessionInspector
        panels={panels}
        header={{ ...header, pullRequests: [...repositoryChanges] }}
        changeActions={{ attach, detach }}
      />
    </View>
  );
}

const meta = {
  title: 'Tests/Screens/Sessions/Session/ChangeSelectionPhone',
  render: (): JSX.Element => <PhoneSheet />,
  beforeEach: (): Promise<void> => {
    detach.mockClear();
    attach.mockClear();

    return settleLayout('phone');
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type Context = Parameters<NonNullable<Story['play']>>[0];

const backLabel = { name: 'Back to Changes' };

// The tab opens on its files unless asked to start over; the Change segment is one press away.
async function showChanges(userEvent: Context['userEvent']): Promise<void> {
  await userEvent.click(await screen.findByRole('button', { name: 'Change' }));
}

const rowOf = (name: string): Promise<HTMLElement> =>
  screen.findByRole('button', { name: new RegExp(`^Show Change ${name},`) });

// A phone's sheet holds the same list, selected Change and Back as the desktop Inspector, and a Change's own controls.
export const ListSelectBack: Story = {
  play: async ({ userEvent }) => {
    await showChanges(userEvent);
    await userEvent.click(await rowOf('fork/app#12'));
    await expect(
      await screen.findByText('Same number in a fork'),
    ).toBeVisible();
    await expect(screen.queryByText('Add the Inspector list')).toBeNull();
    await expect(
      screen.getByRole('button', { name: 'Open on GitHub' }),
    ).toBeVisible();

    await userEvent.click(screen.getByRole('button', backLabel));
    await expect(await rowOf('owner/app#12')).toBeVisible();
    await expect(screen.queryByRole('button', backLabel)).toBeNull();
  },
};

// The sheet lists every Change, Merged and Closed too, until each is detached.
export const ListHoldsEveryStage: Story = {
  play: async ({ userEvent }) => {
    await showChanges(userEvent);

    for (const name of [
      'owner/app#12',
      'fork/app#12',
      'owner/app#9',
      'owner/app#7',
    ])
      await expect(await rowOf(name)).toBeVisible();
  },
};

export const DetachFromTheSheet: Story = {
  play: async ({ userEvent }) => {
    await showChanges(userEvent);
    await userEvent.click(await rowOf('owner/app#9'));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Detach' }),
    );
    await waitFor(() => expect(detach).toHaveBeenCalledTimes(1));
    await expect(detach.mock.calls[0]?.[0]).toMatchObject({
      id: 'github:owner/app#9',
    });
  },
};

// A phone's sheet attaches a typed reference, as the desktop Inspector does.
export const AttachFromTheSheet: Story = {
  play: async ({ userEvent }) => {
    await showChanges(userEvent);
    await userEvent.type(
      await screen.findByRole('textbox', { name: 'Pull request' }),
      'owner/app#20',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Attach' }));
    await waitFor(() => expect(attach).toHaveBeenCalledWith('owner/app#20'));
  },
};
