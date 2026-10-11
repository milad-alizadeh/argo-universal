import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#lib/generic/primitives/card';
import { Input } from '#lib/generic/primitives/input';
import { Text } from '#lib/generic/primitives/text';
import { Button } from './button';

function CardPreview(): React.JSX.Element {
  return (
    <Card className="w-full max-w-sm">
      <NewsletterHeader />
      <NewsletterFields />
      <NewsletterFooter />
    </Card>
  );
}
function NewsletterHeader(): React.JSX.Element {
  return (
    <CardHeader className="flex-row">
      <View className="flex-1 gap-1.5">
        <CardTitle>Subscribe to our newsletter</CardTitle>
        <CardDescription>
          Enter your details to receive updates and tips
        </CardDescription>
      </View>
    </CardHeader>
  );
}
const newsletterFields = [
  { id: 'email', label: 'Email', placeholder: 'm@example.com' },
  { id: 'name', label: 'Name', placeholder: 'John Doe' },
];
function NewsletterFields(): React.JSX.Element {
  return (
    <CardContent>
      <View className="w-full justify-center gap-4">
        {newsletterFields.map((field) => (
          <NewsletterField key={field.id} {...field} />
        ))}
      </View>
    </CardContent>
  );
}
function NewsletterFooter(): React.JSX.Element {
  return (
    <CardFooter className="flex-col gap-2">
      <Button className="w-full" label={'Subscribe'} appearance="content" />
      <Button
        variant="outline"
        className="w-full"
        label={'Later'}
        appearance="content"
      />
    </CardFooter>
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

function NewsletterField({
  id,
  label,
  placeholder,
}: (typeof newsletterFields)[number]): React.JSX.Element {
  const inputProps = { id, accessibilityLabel: label, placeholder };
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium">{label}</Text>
      <Input {...inputProps} />
    </View>
  );
}
