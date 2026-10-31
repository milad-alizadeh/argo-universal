import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { withStack } from '@repo/kit/story-stack';
import { newSessionProjects, serverInfo } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { ServerPlaceProvider } from '../../../../lib/product/server-place';
import { StartSessionIn, type StartSessionInProps } from './start-session-in';

const searchName = 'Search Project';

const [exampleProject, landingProject] = ((): [
  (typeof newSessionProjects)[number],
  (typeof newSessionProjects)[number],
] => {
  const [first, second] = newSessionProjects;

  if (!first || !second)
    throw new Error('Recorded catalog needs two Projects.');

  return [first, second];
})();

// A search that only the second Project's name or folder matches.
const landingSearch = landingProject.name.slice(0, 4).toLowerCase();

if (
  [exampleProject.name, exampleProject.path].some((text) =>
    text.toLowerCase().includes(landingSearch),
  )
)
  throw new Error(
    'Recorded catalog needs a Project whose name the other Project lacks.',
  );

// Swaps the chosen Project in, as New Session does when the reader picks one.
function ChoosingProject(props: StartSessionInProps): React.JSX.Element {
  const [projectId, setProjectId] = useState(props.projectId);

  return (
    <View className="p-4">
      <StartSessionIn
        {...props}
        projectId={projectId}
        onProjectChange={(id) => {
          props.onProjectChange(id);
          setProjectId(id);
        }}
      />
    </View>
  );
}

const meta = {
  title: 'Tests/Composer/StartSessionIn',
  component: StartSessionIn,
  render: (args): React.JSX.Element => <ChoosingProject {...args} />,
  args: {
    serverName: serverInfo.name,
    serverConnected: true,
    projects: newSessionProjects,
    projectId: exampleProject.id,
    onProjectChange: fn(),
    checkout: {
      branch: 'main',
      newWorktree: true,
      onNewWorktreeChange: fn(),
    },
  },
} satisfies Meta<typeof StartSessionIn>;

export default meta;

type Story = StoryObj<typeof meta>;

// The screen the picker sits on: a phone's stack draws its header and pushes the picker's page over it.
const onPageInStack: NonNullable<Story['decorators']> = [
  (Story): React.JSX.Element => (
    <Screen title="New session">
      <Story />
    </Screen>
  ),
  withStack(),
];

// A phone's pushed page holds its search behind the header's search button, as a native header's bar does.
async function searchField(
  width: number,
  overlay: ReturnType<typeof within>,
  userEvent: Parameters<NonNullable<Story['play']>>[0]['userEvent'],
): Promise<HTMLElement> {
  if (width !== layoutWidths.phone)
    return overlay.findByRole('searchbox', { name: searchName });

  await userEvent.click(
    await overlay.findByRole('button', { name: searchName }),
  );

  return overlay.findByRole('textbox', { name: searchName });
}

function switchProject(width: number): Story {
  return {
    decorators: onPageInStack,
    play: async ({ canvas, userEvent, args }) => {
      await settleLayout(width);
      const overlay = within(document.body);
      await userEvent.click(
        canvas.getByRole('button', {
          name: `Project: ${exampleProject.name}`,
        }),
      );
      await userEvent.type(
        await searchField(width, overlay, userEvent),
        landingSearch,
      );
      await expect(
        overlay.queryByRole('radio', { name: exampleProject.name }),
      ).not.toBeInTheDocument();
      await userEvent.click(
        overlay.getByRole('radio', { name: landingProject.name }),
      );
      await expect(args.onProjectChange).toHaveBeenCalledOnce();
      await expect(args.onProjectChange).toHaveBeenCalledWith(
        landingProject.id,
      );
      await expect(
        await canvas.findByRole('button', {
          name: `Project: ${landingProject.name}`,
        }),
      ).toBeVisible();
      // One tap picks a Project and closes the picker.
      await waitFor(() =>
        expect(
          overlay.queryByRole('searchbox', { name: searchName }),
        ).not.toBeInTheDocument(),
      );
    },
  };
}

export const SwitchProjectPhone = switchProject(layoutWidths.phone);

export const SwitchProjectWide = switchProject(layoutWidths.wide);

// On the Server's own computer the App does not name the host.
export const ServerOnThisComputer: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(serverInfo.name)).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole('img', { name: 'Connected' }),
    ).not.toBeInTheDocument();
  },
};

// A lost Connection still shows, even without the host's name.
export const ReconnectingOnThisComputer: Story = {
  args: { serverConnected: false },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Reconnecting…')).toBeVisible();
    await expect(canvas.queryByText(serverInfo.name)).not.toBeInTheDocument();
  },
};

// A device paired to a Server on another computer names that computer.
export const PairedToAnotherComputer: Story = {
  render: (args): React.JSX.Element => (
    <ServerPlaceProvider paired>
      <ChoosingProject {...args} />
    </ServerPlaceProvider>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText(serverInfo.name)).toBeVisible();
    await expect(canvas.getByRole('img', { name: 'Connected' })).toBeVisible();
  },
};

const rect = (element: Element): DOMRect => element.getBoundingClientRect();

// How far a control sits from each edge of the row it is laid out in.
type Insets = { leading: number; trailing: number };

function insets(row: Element, control: Element): Insets {
  const rowBox = rect(row),
    controlBox = rect(control);

  return {
    leading: controlBox.left - rowBox.left,
    trailing: rowBox.right - controlBox.right,
  };
}

type Canvas = ReturnType<typeof within>;

const startRow = (canvas: Canvas): Element =>
  canvas.getByLabelText('Start the Session in');

/*
 * A pill's touch target is larger than the pill and stretches to the column it sits in, so neither it nor the
 * drawn pill is where a reader sees the control begin. Its words are, and both pills lead with an icon of one
 * size, so two labels share an x exactly when the pills they sit in do.
 */
const projectLabel = (canvas: Canvas): Element =>
  canvas.getByText(exampleProject.name);

// Only a phone draws the Checkout control; a wide row leaves that to the Composer.
const checkoutLabel = (canvas: Canvas): Element =>
  canvas.getByText('New worktree');

function control(found: Element | null): Element {
  if (!found)
    throw new Error('The row draws a Server and a Project to lay out.');

  return found;
}

/*
 * These two stories measure the row's own layout, so they render it bare, not in `onPageInStack`: on web the stack
 * centres its card and shrinks it to its content, which leaves the row zero wide (CI read leading 53, trailing -53).
 * Bare, the canvas still centres and shrinks the row to its widest pill, so every inset is the label's offset
 * inside that pill and reads the same on both sides (leading 53, trailing 53). A page gives the row its column's
 * whole width, so these give it that.
 */
const fullWidth: NonNullable<Story['decorators']> = [
  (Story): React.JSX.Element => (
    <View className="w-full">
      <Story />
    </View>
  ),
];

/*
 * A phone stacks the two pills on the page's content inset, so they begin at one x and each sits far nearer the
 * row's leading edge than its trailing one. Centred, pills of different widths begin at different x.
 */
export const PillsOnTheContentInsetPhone: Story = {
  decorators: fullWidth,
  play: async ({ canvas }) => {
    await settleLayout(layoutWidths.phone);

    const row = startRow(canvas),
      project = projectLabel(canvas),
      checkout = checkoutLabel(canvas);

    // Two text nodes' fractional lefts may differ by rounding; a pill centred instead differs by tens of px.
    await expect(
      Math.abs(rect(project).left - rect(checkout).left),
    ).toBeLessThan(1);

    for (const label of [project, checkout]) {
      const { leading, trailing } = insets(row, label);

      await expect(leading).toBeLessThan(trailing);
    }
  },
};

// Wide lays the Server and the Project out as one centred group, which the phone fix leaves alone.
export const RowStaysCentredWide: Story = {
  decorators: fullWidth,
  play: async ({ canvas }) => {
    await settleLayout(layoutWidths.wide);
    const row = startRow(canvas);

    const { leading } = insets(row, control(row.firstElementChild)),
      { trailing } = insets(row, control(row.lastElementChild));

    await expect(Math.abs(leading - trailing)).toBeLessThan(1);
  },
};
