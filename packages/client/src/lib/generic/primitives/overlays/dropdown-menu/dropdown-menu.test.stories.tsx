import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { userEvent as browserUser } from 'vitest/browser';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Text } from '../../display/text/text';
import { Pressable, contentActionClass } from '../../pressable/pressable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

const branches = Array.from(
  { length: 60 },
  (_, index) => `feature/branch-${String(index + 1).padStart(2, '0')}`,
);

const lastBranch = 'feature/branch-60';

function LongMenu(): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Pressable role="button" className={contentActionClass({})}>
          <Text>Branches</Text>
        </Pressable>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {branches.map((branch) => (
          <DropdownMenuItem key={branch}>
            <Text>{branch}</Text>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const meta = {
  title: 'Tests/DropdownMenu',
  component: LongMenu,
} satisfies Meta<typeof LongMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

function insideViewport(element: Element): boolean {
  const { top, bottom } = element.getBoundingClientRect();

  return top >= 0 && bottom <= window.innerHeight;
}

function longMenuScrolls(width: number): Story {
  return {
    play: async ({ canvas, canvasElement, userEvent }) => {
      await settleViewport(width);
      const page = within(canvasElement.ownerDocument.body);
      await userEvent.click(canvas.getByRole('button', { name: 'Branches' }));
      const menu = await page.findByRole('menu');
      const last = page.getByRole('menuitem', { name: lastBranch });

      await waitFor(() => expect(insideViewport(menu)).toBe(true));
      await expect(insideViewport(last)).toBe(false);
      await browserUser.wheel(menu, { direction: 'down', times: 40 });
      await waitFor(() => expect(insideViewport(last)).toBe(true));
      await userEvent.click(last);
      await waitFor(() =>
        expect(page.queryByRole('menu')).not.toBeInTheDocument(),
      );
    },
  };
}

export const LongMenuScrollsWide = longMenuScrolls(layoutWidths.wide);

export const LongMenuScrollsPhone = longMenuScrolls(layoutWidths.phone);
