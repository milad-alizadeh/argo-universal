import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Button } from '#primitives/actions/button';
import { contentActionClass, Pressable } from '#primitives/actions/pressable';
import { Text } from '#primitives/content/text';
import { FieldGroup } from '#primitives/fields/field-group';
import { useCentresOverlays } from '#primitives/overlays/centred-overlay';
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

type Field = { id: string; label: string; defaultValue: string };

const profileFields: Field[] = [
  { id: 'name-1', label: 'Name', defaultValue: 'Pedro Duarte' },
  { id: 'username-1', label: 'Username', defaultValue: '@peduarte' },
];

const moreFields: Field[] = [
  { id: 'email-1', label: 'Email', defaultValue: 'pedro@example.com' },
  { id: 'website-1', label: 'Website', defaultValue: 'example.com' },
  { id: 'company-1', label: 'Company', defaultValue: 'Acme' },
  { id: 'role-1', label: 'Role', defaultValue: 'Designer' },
  { id: 'city-1', label: 'City', defaultValue: 'Lisbon' },
  { id: 'country-1', label: 'Country', defaultValue: 'Portugal' },
  { id: 'timezone-1', label: 'Time zone', defaultValue: 'Europe/Lisbon' },
  { id: 'language-1', label: 'Language', defaultValue: 'English' },
  { id: 'pronouns-1', label: 'Pronouns', defaultValue: 'he/him' },
  { id: 'phone-1', label: 'Phone', defaultValue: '+351 912 345 678' },
];

/*
 * The heading, sections and actions are the dialog's own children: on a phone its sections are one FieldGroup under
 * the heading, which scrolls, and its actions are pinned in the sheet's footer.
 */
function ProfileDialog(props: { fields: Field[] }): React.JSX.Element {
  const narrow = !useCentresOverlays();

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
      <DialogContent className="sm:max-w-106">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup.Section>
          {props.fields.map((field) => (
            <ProfileField key={field.id} {...field} />
          ))}
        </FieldGroup.Section>
        <DialogFooter>
          <DialogCancel label="Cancel" />
          <Button label="Save changes" fullWidth={narrow} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const meta = {
  title: 'Design System/Primitives/Overlays/Dialog',
  component: Dialog,
  argTypes: kitArgTypes('Dialog'),
  tags: ['third-party'],
} satisfies Meta<typeof Dialog>;

export default meta;

type Story = StoryObj<typeof meta>;

// A dialog is a composition — trigger, header, fields, footer — so it keeps its own render.
export const Default: Story = {
  render: (): React.JSX.Element => <ProfileDialog fields={profileFields} />,
};

// More rows than a phone's sheet holds: the FieldGroup scrolls them while the heading and the actions stay put.
export const LongForm: Story = {
  render: (): React.JSX.Element => (
    <ProfileDialog fields={[...profileFields, ...moreFields]} />
  ),
};

function ProfileField({ label, defaultValue }: Field): React.JSX.Element {
  const [value, setValue] = useState(defaultValue);

  return (
    <FieldGroup.TextField title={label} value={value} onChangeText={setValue} />
  );
}
