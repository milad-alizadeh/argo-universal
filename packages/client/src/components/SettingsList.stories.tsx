import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { settingsListMocks } from '../../mocks/settings-list-mock';
import { SettingsList } from './SettingsList';

const meta = {
  title: 'Settings/SettingsList',
  component: SettingsList,
  args: { ...settingsListMocks, onSelect: action('select Settings page') },
} satisfies Meta<typeof SettingsList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Projects: Story = {
  render: (args) => (
    <Variations>
      {[[], settingsListMocks.projects].map((projects) => (
        <Variation
          key={projects.length}
          label={projects.length ? 'One Project' : 'Waiting for Projects'}
        >
          <SettingsList {...args} projects={projects} />
        </Variation>
      ))}
    </Variations>
  ),
};
export const Agents: Story = {
  render: (args) => (
    <Variations>
      {[[], settingsListMocks.agents].map((agents) => (
        <Variation
          key={agents.length}
          label={agents.length ? 'Registered Agents' : 'Waiting for Agents'}
        >
          <SettingsList {...args} agents={agents} />
        </Variation>
      ))}
    </Variations>
  ),
};
export const SelectedDestination: Story = {
  render: (args) => (
    <Variations>
      <Variation label="Phone list">
        <SettingsList {...args} />
      </Variation>
      <Variation label="Accounts selected in sidebar">
        <SettingsList
          {...args}
          selectedDestination={{ to: 'settings-accounts' }}
        />
      </Variation>
      <Variation label="Project selected in sidebar">
        <SettingsList
          {...args}
          selectedDestination={{
            to: 'settings-project',
            name: 'example-project',
          }}
        />
      </Variation>
    </Variations>
  ),
};
