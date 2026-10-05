import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { ProjectsLoading } from './ProjectsLoading';

const meta = {
  title: 'Sessions/ProjectsLoading',
  component: ProjectsLoading,
} satisfies Meta<typeof ProjectsLoading>;
export default meta;
export const Default: StoryObj<typeof meta> = {
  render: () => (
    <Variations>
      <Variation label="Loading">
        <ProjectsLoading />
      </Variation>
    </Variations>
  ),
};
