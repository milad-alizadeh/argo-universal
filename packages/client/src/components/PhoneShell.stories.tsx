import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { PhoneShellMock } from '../../mocks/phone-shell-mock';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { PhoneShell, type ShellSection } from './PhoneShell';

const meta = {
  title: 'Shell/PhoneShell',
  component: PhoneShell,
  args: {
    selectedSection: 'sessions',
    attentionCount: 1,
    drawerOpen: false,
    children: null,
    onDrawerOpenChange: action('drawer open changed'),
    onSectionChange: action('section changed'),
    onSearch: action('search'),
    onFilter: action('filter'),
  },
} satisfies Meta<typeof PhoneShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelectedSection: Story = {
  render: (args) => (
    <Variations className="max-w-none">
      {(
        ['sessions', 'issues', 'atlas', 'settings'] satisfies ShellSection[]
      ).map((section) => (
        <Variation key={section} label={section}>
          <View className="h-[480px] w-full">
            <PhoneShellMock
              key={section}
              {...args}
              selectedSection={section}
              drawerOpen
            />
          </View>
        </Variation>
      ))}
    </Variations>
  ),
};

export const AttentionCount: Story = {
  render: (args) => (
    <Variations className="max-w-none">
      {[0, 1, 100].map((count) => (
        <Variation key={count} label={count > 99 ? '99+' : String(count)}>
          <View className="h-[480px] w-full">
            <PhoneShellMock {...args} attentionCount={count} drawerOpen />
          </View>
        </Variation>
      ))}
    </Variations>
  ),
};

export const DrawerOpen: Story = {
  render: (args) => (
    <Variations className="max-w-none">
      {[false, true].map((open) => (
        <Variation key={String(open)} label={open ? 'Open' : 'Closed'}>
          <View className="h-[600px] w-full">
            <PhoneShellMock {...args} drawerOpen={open} />
          </View>
        </Variation>
      ))}
    </Variations>
  ),
};
