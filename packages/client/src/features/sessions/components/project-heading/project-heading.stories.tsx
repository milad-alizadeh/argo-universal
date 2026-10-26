import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { ProjectHeading } from './project-heading';
import { collapsedProject, expandedProject } from './project-heading-fixtures';

const meta = {
  title: 'Sessions/ProjectHeading',
  component: ProjectHeading,
  argTypes: {
    name: { control: 'text' },
    collapsed: { control: 'boolean' },
    onToggle: { control: false },
    onAdd: { control: false },
    onProjectSettings: { control: false },
  },
  args: {
    ...expandedProject,
    onToggle: action('toggle Project'),
    onAdd: action('add to Project'),
    onProjectSettings: action('Project settings'),
  },
  // The heading opens and closes on its own, from the state the story starts in.
  render: function HeadingPreview(args): React.JSX.Element {
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
} satisfies Meta<typeof ProjectHeading>;

export default meta;

type Story = StoryObj<typeof meta>;

// An open folder over the Project's Sessions; a wide window draws New Session and Project settings beside the name.
export const Expanded: Story = { args: expandedProject };

// Closed: the folder shuts and the Project's Sessions are hidden.
export const Collapsed: Story = { args: collapsedProject };
