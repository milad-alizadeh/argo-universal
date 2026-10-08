import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { createSessionCountsMock } from '../../mocks/session-counts-mock';
import { sessionListMocks } from '../../mocks/session-list-mock';
import { createNavigationRecorder } from '../../mocks/with-navigation-mocks';
import { PhoneLayout } from '../components/phone-layout';
import type { ShellSection } from '../components/shell-sections';
import {
  type NavigationDestination,
  NavigationProvider,
} from '../navigation/context';
import { sectionDestination, sectionOf } from '../navigation/sections';
import { PhoneSectionScreen } from './phone-section-screen';

const recorder = createNavigationRecorder();
const counts = createSessionCountsMock({ attention: 1, running: 1 });

// Follows each navigation, so the drawer closes over the next section as in the app.
function NavigatingPhoneLayout({
  section,
}: {
  section: ShellSection;
}): React.JSX.Element {
  const [destination, setDestination] = useState<NavigationDestination>(
    sectionDestination(section),
  );
  return (
    <NavigationProvider
      navigate={(next) => {
        recorder.navigate(next);
        setDestination(next);
      }}
    >
      <View className="h-[796px] w-full">
        <PhoneLayout destination={destination}>
          <PhoneSectionScreen section={sectionOf(destination)} />
        </PhoneLayout>
      </View>
    </NavigationProvider>
  );
}
const meta = {
  title: 'Tests/PhoneSectionScreen',
  component: PhoneSectionScreen,
  args: { section: 'sessions' },
  render: (args): React.JSX.Element => (
    <NavigatingPhoneLayout section={args.section} />
  ),
  parameters: { navigation: recorder, trpc: sessionListMocks },
  beforeEach: async (): Promise<void> => {
    recorder.reset();
    const { page } = await import('vitest/browser');
    await page.viewport(390, 844);
  },
} satisfies Meta<typeof PhoneSectionScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const DrawerOpensSectionLists: Story = {
  play: async ({ canvas, userEvent }) => {
    // ☰ and the Sessions list's search and filter share one header row.
    await expect(
      await canvas.findByRole('button', { name: 'Search Sessions' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Filter Sessions' }),
    ).toBeVisible();
    await expect(
      canvas.getAllByRole('heading', { name: 'Sessions', level: 1 }),
    ).toHaveLength(1);
    for (const section of ['Settings', 'Atlas']) {
      await userEvent.click(
        canvas.getByRole('button', { name: 'Open navigation' }),
      );
      await userEvent.click(
        await canvas.findByRole('button', { name: new RegExp(`^${section}$`) }),
      );
    }
    await expect(recorder.destinations).toEqual([
      { to: 'settings' },
      { to: 'atlas' },
    ]);
  },
};

export const SettingsListOpensItsPages: Story = {
  args: { section: 'settings' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Connection' }),
    );
    await expect(recorder.destinations).toEqual([
      { to: 'settings-connection' },
    ]);
  },
};

export const DrawerBadgeFollowsSessionCounts: Story = {
  parameters: { trpc: counts.fixtures },
  beforeEach: () => counts.reset(),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Open navigation' }),
    );
    await expect(
      await canvas.findByLabelText('1 Session needs attention'),
    ).toHaveTextContent('1');
    counts.publish({ attention: 2, running: 0 });
    await expect(
      await canvas.findByLabelText('2 Sessions need attention'),
    ).toHaveTextContent('2');
  },
};
