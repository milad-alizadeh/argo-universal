import {
  PageCalls,
  type PageCallsPorts,
  type ScopedRun,
} from '@repo/contracts/plugins/page-calls';
import type { WireNode } from '@repo/contracts/plugins/wire';
import { issueBoardRoot } from '@repo/contracts/plugins/wire-fixtures';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { dismissToasts, showToast } from '@repo/kit/primitives/overlays/toast';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useRef, useState, type ReactElement } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { findToast } from '../../../../../kit/mocks/find-toast';
import { PluginTree } from './plugin-registry';

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/Board',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type Play = NonNullable<Story['play']>;

// The board as a Plugin sends it: JSON over the wire; a move runs the Plugin's `transition`.
const board: WireNode = JSON.parse(JSON.stringify(issueBoardRoot));

const run = fn<(run: ScopedRun) => Promise<void>>();

const refused = 'The tracker refused the move';

/*
 * A Loader page's tree as the App keeps it: a move's call runs through PageCalls, which shows the card's
 * optimistic props at once and takes them back when `run` fails, saying why in a toast.
 */
function BoardPage(): ReactElement {
  const [root, setRoot] = useState(board);
  const shown = useRef(root);
  const draw = (next: WireNode): void => {
    shown.current = next;
    setRoot(next);
  };
  const ports: PageCallsPorts = {
    scope: {},
    shown: () => shown.current,
    patch: async (patch) => draw(patch(shown.current)),
    unpatch: (patch) => draw(patch(shown.current)),
    run,
    failed: (error) =>
      showToast({
        title: 'That did not work',
        message: error.message,
        tone: 'danger',
      }),
  };
  const [calls] = useState(() => new PageCalls(ports));

  return (
    <PluginTree
      root={root}
      onPageCall={(call, event) => calls.call(call, event)}
    />
  );
}

const cardIn = (canvasElement: HTMLElement, lane: string, title: string) =>
  within(within(canvasElement).getByRole('group', { name: lane })).queryByRole(
    'button',
    { name: new RegExp(`^${title}`) },
  );

// Moves Fix login to In progress from its menu, the one column it names.
async function moveFixLogin(
  canvasElement: HTMLElement,
  user: Parameters<Play>[0]['userEvent'],
) {
  const card = within(canvasElement).getByRole('button', {
    name: /^Fix login/,
  });

  await user.pointer({ target: card, keys: '[MouseRight]' });

  const menu = await within(canvasElement.ownerDocument.body).findByRole(
    'menu',
  );

  await expect(
    within(menu).queryByRole('menuitem', { name: 'Move to Done' }),
  ).toBeNull();
  await user.click(
    within(menu).getByRole('menuitem', { name: 'Move to In progress' }),
  );
}

function moving(
  width: 'phone' | 'wide',
  answer: () => Promise<void>,
  play: Play,
): Story {
  return {
    beforeEach: async () => {
      run.mockReset();
      run.mockImplementation(answer);
      dismissToasts();
      await settleLayout(width);
    },
    render: () => <BoardPage />,
    play,
  };
}

const pending = (): Promise<void> => new Promise(() => {});

// The move fills the Operation call: the card and the column it lands in, as the Plugin's params.
export const MoveFillsTheOperationCall = moving(
  'wide',
  async () => {},
  async ({ canvasElement, userEvent }) => {
    await moveFixLogin(canvasElement, userEvent);

    await waitFor(() =>
      expect(run).toHaveBeenCalledWith({
        operation: 'transition',
        args: { issue: 'login', status: 'doing' },
      }),
    );
  },
);

// While the Operation runs, the card shows in its new column at once, with a spinner.
const pendingMove: Play = async ({ canvasElement, userEvent }) => {
  await moveFixLogin(canvasElement, userEvent);

  await waitFor(() =>
    expect(cardIn(canvasElement, 'In progress', 'Fix login')).toBeVisible(),
  );
  await expect(cardIn(canvasElement, 'To do', 'Fix login')).toBeNull();
  await expect(
    within(canvasElement).getByRole('progressbar', { name: 'Moving' }),
  ).toBeVisible();
};

export const PendingMoveShowsAtOnce = moving('wide', pending, pendingMove);

export const PendingMoveShowsAtOnceOnAPhone = moving(
  'phone',
  pending,
  pendingMove,
);

// A failed Operation puts the card back where it was and says why.
export const FailedMovePutsTheCardBack = moving(
  'wide',
  () => Promise.reject(new Error(refused)),
  async ({ canvasElement, userEvent }) => {
    await moveFixLogin(canvasElement, userEvent);

    await findToast(refused);
    await waitFor(() =>
      expect(cardIn(canvasElement, 'To do', 'Fix login')).toBeVisible(),
    );
    await expect(cardIn(canvasElement, 'In progress', 'Fix login')).toBeNull();
    await expect(
      within(canvasElement).queryByRole('progressbar', { name: 'Moving' }),
    ).toBeNull();
  },
);
