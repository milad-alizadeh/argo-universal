import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ScrollFadeView } from './scroll-fade';
import {
  ScrollFadePreview,
  ScrollFadeRowPreview,
} from './scroll-fade-preview.mocks';

/*
 * A fade only appears once content overflows, so each story draws the scroll view inside the panel
 * it ships in rather than passing children as an arg. ScrollFadeViewProps is an intersection
 * declared in @repo/kit, which react-docgen cannot follow (docs/agents/storybook.md, "Docgen"),
 * so the descriptions live here with the prop domain.
 */
const meta = {
  title: 'Design System/Patterns/ScrollFade',
  component: ScrollFadeView,
  argTypes: {
    horizontal: {
      control: 'boolean',
      description:
        'Sideways: the leading and trailing edges fade instead of the top and bottom.',
    },
    fitContent: {
      control: 'boolean',
      description:
        'Grows with its content up to the max height in className, then scrolls; otherwise it fills its parent.',
    },
    surfaceClassName: {
      control: 'text',
      description:
        'The surface colour a native overlay fades into; the web fades the content itself and needs none.',
    },
    edges: {
      control: false,
      description:
        'How each edge fades: as content scrolls past it, always, or never.',
    },
    depth: { control: false, description: 'How deep each edge fades.' },
    inset: {
      control: false,
      description:
        'How far something laid over the scroll view covers an edge.',
    },
    children: { control: false, description: 'The content that scrolls.' },
  },
} satisfies Meta<typeof ScrollFadeView>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * One story per axis, which is the fork ScrollFadeView makes on `horizontal`. `fitContent` has no
 * story: it only changes how a vertical view takes its height from a parent that does not fix one,
 * and both panels here fix theirs.
 */

// The content fades under the top edge it has scrolled past and under the bottom edge still hiding it.
export const Vertical: Story = { render: () => <ScrollFadePreview /> };

// The leading and trailing edges fade instead, and the row takes its height from its content.
export const Horizontal: Story = { render: () => <ScrollFadeRowPreview /> };
