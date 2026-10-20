import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { ProjectHeading } from './project-heading';

const meta = {
  title: 'SessionList/ProjectHeading',
  component: ProjectHeading,
  args: {
    name: 'Example Project',
    collapsed: false,
    onToggle: action('toggle Project'),
    onAdd: action('add to Project'),
    onProjectSettings: action('Project settings'),
  },
} satisfies Meta<typeof ProjectHeading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Heading: Story = {
  render: function HeadingPreview(args) {
    const [collapsed, setCollapsed] = useState(args.collapsed);

    return (
      <View className="w-full wide:w-frame-list bg-content">
        <ProjectHeading
          {...args}
          collapsed={collapsed}
          onToggle={() => {
            setCollapsed((current) => !current);
            args.onToggle();
          }}
        />
      </View>
    );
  },
};
