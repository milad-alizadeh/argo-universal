import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { userEvent as browserKeyboard } from 'vitest/browser';
import {
  resizeInspectorLabel,
  resizeSidebarLabel,
} from './scaffold-controls.mocks';
import {
  controlledPlay,
  scaffoldMeta,
  type ScaffoldStory,
} from './scaffold-test.mocks';
import { ScaffoldMock } from './scaffold.mocks';

const meta = {
  title: 'Tests/Frame/Scaffold/Focus',
  ...scaffoldMeta,
} satisfies Meta<typeof ScaffoldMock>;

export default meta;

// More stops than the frame has, so a full cycle through it always fits.
const tabLimit = 80;

interface TabStop {
  name: string;
  focusVisible: boolean;
}

const isControl = (element: Element | null): element is Element =>
  element !== null && element !== document.body;

function stopOf(element: Element | null): TabStop | null {
  if (!isControl(element)) return null;

  return {
    name: element.getAttribute('aria-label') ?? '',
    focusVisible: element.matches(':focus-visible'),
  };
}

function clearFocus(): void {
  if (document.activeElement instanceof HTMLElement)
    document.activeElement.blur();
}

// Tab from the top of the page until focus leaves its controls or the limit is hit; what each stop was named and whether it showed focus.
async function tabOrder(): Promise<TabStop[]> {
  const stops: TabStop[] = [];

  clearFocus();

  for (let press = 0; press < tabLimit; press += 1) {
    await browserKeyboard.tab();
    const stop = stopOf(document.activeElement);

    if (!stop) break;
    stops.push(stop);
  }

  return stops;
}

const stopNamed = (
  stops: readonly TabStop[],
  name: string,
): TabStop | undefined => stops.find((stop) => stop.name === name);

// A resize handle takes Tab, and takes it as keyboard focus, which is what the focus ring is drawn from.
export const SidebarHandleTakesKeyboardFocus: ScaffoldStory = {
  play: controlledPlay(async () => {
    await settleLayout('wide');
    const stops = await tabOrder();

    await expect(stopNamed(stops, resizeSidebarLabel)?.focusVisible).toBe(true);
  }),
};

// With a Session open there is an Inspector to resize, and its handle is a Tab stop.
export const InspectorHandleIsATabStopBesideASession: ScaffoldStory = {
  play: controlledPlay(async () => {
    await settleLayout('wide');
    const stops = await tabOrder();

    await expect(stopNamed(stops, resizeInspectorLabel)?.focusVisible).toBe(
      true,
    );
  }),
};

// No Session, no Inspector: nothing to resize, so no Tab stop for it.
export const NoInspectorHandleTabStopWithoutASession: ScaffoldStory = {
  args: { band: null, inspectorAvailable: false },
  play: controlledPlay(async () => {
    await settleLayout('wide');
    const stops = await tabOrder();

    await expect(stopNamed(stops, resizeSidebarLabel)).toBeDefined();
    await expect(stopNamed(stops, resizeInspectorLabel)).toBeUndefined();
  }),
};
