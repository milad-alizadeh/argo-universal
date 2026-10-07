import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import * as Haptics from 'expo-haptics';
import * as React from 'react';
import { Platform, View } from 'react-native';
import { Checkbox } from '#primitives/checkbox';
import { Label } from '#primitives/label';

function LabelPreview() {
  const [checked, setChecked] = React.useState(false);

  function onCheckedChange(checked: boolean) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecked(checked);
  }

  return (
    <View className="flex-row items-center gap-2">
      <Checkbox
        aria-labelledby="terms-checkbox"
        id="terms-checkbox"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
      <Label
        nativeID="terms-checkbox"
        htmlFor="terms-checkbox"
        onPress={Platform.select({
          native: () => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setChecked((prev) => !prev);
          },
        })}
      >
        Accept terms and conditions
      </Label>
    </View>
  );
}

const meta = {
  title: 'Design System/Primitives/Label',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Label',
  render: () => <LabelPreview />,
};
