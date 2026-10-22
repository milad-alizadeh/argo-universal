import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Picker } from './picker';
import { SingleExample } from './picker-examples';
import { searchableListPicker } from './picker-fixtures';
import type { SinglePickerProps } from './picker-props';

/*
 * More options than a phone menu holds: iOS and Android swap the Picker for the searchable Combobox
 * page (`picker-drill-in.native.tsx`), so this state draws in the iOS and Android previews. The web
 * has no drill-in, and keeps one list behind the trigger every other Picker story draws.
 */
const meta = {
  title: 'Design System/Primitives/Inputs/Picker/DrillIn',
  component: Picker,
  args: { ...searchableListPicker, onValueChange: (): void => {} },
  argTypes: kitArgTypes('Picker'),
  parameters: { screenPreview: true },
  render: (args): React.JSX.Element => <SingleExample {...args} />,
} satisfies Meta<SinglePickerProps<string>>;

export default meta;

export const SearchableList: StoryObj<typeof meta> = {
  args: searchableListPicker,
  parameters: {
    docs: {
      description: {
        story: 'Enough options to search, with long labels and a disabled one.',
      },
    },
  },
};
