import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Button } from '#primitives/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#primitives/dialog';
import { Input } from '#primitives/input';
import { Text } from '#primitives/text';

function DialogPreview(): React.JSX.Element {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Text>Open Dialog</Text>
        </Button>
      </DialogTrigger>
      <ProfileContent />
    </Dialog>
  );
}
function ProfileContent(): React.JSX.Element {
  return (
    <DialogContent className="sm:max-w-[425px]">
      <ProfileHeader />
      <ProfileFields />
      <ProfileFooter />
    </DialogContent>
  );
}
function ProfileHeader(): React.JSX.Element {
  return (
    <DialogHeader>
      <DialogTitle>Edit profile</DialogTitle>
      <DialogDescription>
        Make changes to your profile here. Click save when you&apos;re done.
      </DialogDescription>
    </DialogHeader>
  );
}
const profileFields = [
  { id: 'name-1', label: 'Name', defaultValue: 'Pedro Duarte' },
  { id: 'username-1', label: 'Username', defaultValue: '@peduarte' },
];
function ProfileFields(): React.JSX.Element {
  return (
    <View className="grid gap-4">
      {profileFields.map((field) => (
        <ProfileField key={field.id} {...field} />
      ))}
    </View>
  );
}
function ProfileFooter(): React.JSX.Element {
  return (
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">
          <Text>Cancel</Text>
        </Button>
      </DialogClose>
      <Button>
        <Text>Save changes</Text>
      </Button>
    </DialogFooter>
  );
}

const meta = {
  title: 'Design System/Primitives/Dialog',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Dialog',
  render: () => <DialogPreview />,
};

function ProfileField({
  id,
  label,
  defaultValue,
}: (typeof profileFields)[number]): React.JSX.Element {
  const inputProps = { id, accessibilityLabel: label, defaultValue };
  return (
    <View className="grid gap-3">
      <Text className="text-sm font-medium">{label}</Text>
      <Input {...inputProps} />
    </View>
  );
}
