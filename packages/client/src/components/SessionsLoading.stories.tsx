import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { SessionsLoading } from './SessionsLoading';

const meta = {
  title: 'Sessions/SessionsLoading',
  component: SessionsLoading,
} satisfies Meta<typeof SessionsLoading>;
export default meta;
export const Default: StoryObj<typeof meta> = {
  render: () => (
    <Variations>
      <Variation label="Loading">
        <SessionsLoading />
      </Variation>
    </Variations>
  ),
};
