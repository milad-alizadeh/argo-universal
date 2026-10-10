import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Button } from '#lib/generic/primitives/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#lib/generic/primitives/card';
import { Input } from '#lib/generic/primitives/input';
import { Label } from '#lib/generic/primitives/label';
import { Text } from '#lib/generic/primitives/text';

function CardPreview() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="flex-row">
        <View className="flex-1 gap-1.5">
          <CardTitle>Subscribe to our newsletter</CardTitle>
          <CardDescription>
            Enter your details to receive updates and tips
          </CardDescription>
        </View>
      </CardHeader>
      <CardContent>
        <View className="w-full justify-center gap-4">
          <View className="gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" placeholder="m@example.com" />
          </View>
          <View className="gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="John Doe" />
          </View>
        </View>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button className="w-full">
          <Text>Subscribe</Text>
        </Button>
        <Button variant="outline" className="w-full">
          <Text>Later</Text>
        </Button>
      </CardFooter>
    </Card>
  );
}

const meta = {
  title: 'Design System/Primitives/Card',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Card',
  render: () => <CardPreview />,
};
