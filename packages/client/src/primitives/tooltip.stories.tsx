import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Platform } from 'react-native';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { Tooltip, TooltipContent, TooltipTrigger } from '#primitives/tooltip';

function TooltipPreview() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">
          <Text>{Platform.select({ web: 'Hover', default: 'Press' })}</Text>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <Text>Add to library</Text>
      </TooltipContent>
    </Tooltip>
  );
}

const meta = {
  title: 'Design System/Primitives/Tooltip',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Tooltip',
  render: () => <TooltipPreview />,
};
