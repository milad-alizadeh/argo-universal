import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Button } from '#primitives/buttons/button';
import { contentActionClass } from '#primitives/buttons/button';
import { Text } from '#primitives/display/text';
import { TextInput } from '#primitives/inputs/text-input';
import { Pressable } from '#primitives/pressable';
import {
  Dialog,
  DialogCancel,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';

function DialogPreview(): React.JSX.Element {
  return (
    <Dialog>
      <DialogTrigger>
        <Pressable
          role="button"
          className={contentActionClass({ variant: 'outline' })}
        >
          <Text>{'Open Dialog'}</Text>
        </Pressable>
      </DialogTrigger>
      <ProfileContent />
    </Dialog>
  );
}

function ProfileContent(): React.JSX.Element {
  return (
    <DialogContent className="sm:max-w-106">
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
      <DialogCancel label="Cancel" />
      {/* A phone's Save fills the sheet's width, as Cancel does. */}
      <Button label="Save changes" fullWidth="narrow" />
    </DialogFooter>
  );
}

const meta = {
  title: 'Design System/Primitives/Dialog',
  tags: ['third-party'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
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
      <Text>{label}</Text>
      <TextInput variant="bare" {...inputProps} />
    </View>
  );
}
