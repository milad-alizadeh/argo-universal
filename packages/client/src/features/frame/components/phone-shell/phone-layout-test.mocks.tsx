import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { View } from 'react-native';
import { expect, fn, type Mock, within } from 'storybook/test';
import type { Section } from '../../../../lib/product/navigation/sections';
import { shellSections } from '../shell-sections';
import { ControlledPhoneLayout } from './controlled-phone-layout.mocks';
import { PhoneShell } from './phone-shell';

export const openNavigationLabel = 'Open navigation';

export const drawerSections = [
  'sessions',
  'issues',
  'atlas',
  'settings',
] satisfies Section[];

export const controlledPhoneLayout = {
  component: PhoneShell,
  args: {
    selectedSection: 'sessions',
    attentionCount: 1,
    drawerOpen: false,
    onDrawerOpenChange: fn(),
    onSectionChange: fn(),
    children: null,
  },
  render: (): React.JSX.Element => (
    <View testID="controlled-phone-layout" className="w-full" />
  ),
} satisfies Meta<typeof PhoneShell>;

type PlayContext = Parameters<
  NonNullable<StoryObj<typeof controlledPhoneLayout>['play']>
>[0];

export type Canvas = PlayContext['canvas'];

export interface PhoneLayoutMount {
  render: (section: Section) => Promise<void>;
  onSectionChange: Mock;
}

function mountPhoneLayout(
  element: HTMLElement,
  attention: number,
): PhoneLayoutMount & { root: Root } {
  const root = createRoot(element);
  const layout = { attentionCount: attention, onSectionChange: fn() };

  const render = async (section: Section): Promise<void> => {
    root.render(<ControlledPhoneLayout {...layout} section={section} />);
    await within(element).findByRole('heading', {
      name: shellSections[section].title,
    });
  };

  return { root, render, onSectionChange: layout.onSectionChange };
}

export async function withPhoneLayout(
  { canvas, attention }: { canvas: Canvas; attention: number },
  run: (layout: PhoneLayoutMount) => Promise<void>,
): Promise<void> {
  const controlled = mountPhoneLayout(
    canvas.getByTestId('controlled-phone-layout'),
    attention,
  );

  try {
    await controlled.render('sessions');
    await run(controlled);
  } finally {
    controlled.root.unmount();
  }
}

interface DrawerPick extends Pick<PlayContext, 'canvas' | 'userEvent'> {
  layout: PhoneLayoutMount;
  section: Section;
}

export async function pickDrawerSection(pick: DrawerPick): Promise<void> {
  const { canvas, userEvent, layout, section } = pick;
  const { title } = shellSections[section];
  await userEvent.click(canvas.getByRole('button', { name: title }));

  if (section !== 'sessions')
    await expect(layout.onSectionChange).toHaveBeenLastCalledWith(section);
  await layout.render(section);
  await expect(
    await canvas.findByRole('heading', { name: title }),
  ).toBeVisible();
}
