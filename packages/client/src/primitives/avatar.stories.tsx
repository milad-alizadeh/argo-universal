import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Avatar, AvatarFallback, AvatarImage } from '#primitives/avatar';
import { Text } from '#primitives/text';

function AvatarPreview() {
  return (
    <View className="flex-row flex-wrap gap-12">
      <Avatar
        alt="@mrzachnugent"
        className="border-background web:border-0 web:ring-2 web:ring-background border-2"
      >
        <AvatarImage source={{ uri: 'https://github.com/mrzachnugent.png' }} />
        <AvatarFallback>
          <Text>ZN</Text>
        </AvatarFallback>
      </Avatar>
      <Avatar
        alt="@shadcn"
        className="border-background web:border-0 web:ring-2 web:ring-background rounded-lg border-2"
      >
        <AvatarImage source={{ uri: 'https://github.com/shadcn.png' }} />
        <AvatarFallback>
          <Text>CN</Text>
        </AvatarFallback>
      </Avatar>
      <View className="flex-row">
        <Avatar
          alt="@mrzachnugent"
          className="border-background web:border-0 web:ring-2 web:ring-background -mr-2 border-2"
        >
          <AvatarImage
            source={{ uri: 'https://github.com/mrzachnugent.png' }}
          />
          <AvatarFallback>
            <Text>ZN</Text>
          </AvatarFallback>
        </Avatar>
        <Avatar
          alt="@leerob"
          className="border-background web:border-0 web:ring-2 web:ring-background -mr-2 border-2"
        >
          <AvatarImage source={{ uri: 'https://github.com/leerob.png' }} />
          <AvatarFallback>
            <Text>LR</Text>
          </AvatarFallback>
        </Avatar>
        <Avatar
          alt="@evilrabbit"
          className="border-background web:border-0 web:ring-2 web:ring-background -mr-2 border-2"
        >
          <AvatarImage source={{ uri: 'https://github.com/evilrabbit.png' }} />
          <AvatarFallback>
            <Text>ER</Text>
          </AvatarFallback>
        </Avatar>
      </View>
    </View>
  );
}

const meta = {
  title: 'Design System/Primitives/Avatar',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Avatar',
  render: () => <AvatarPreview />,
};
