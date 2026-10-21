import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { kitArgTypes } from '#lib/generic/kit-arg-types';
import { CentredOverlayScope } from '#primitives/overlays/centred-overlay';
import { Variation, Variations as VariationList } from '../../../variations';
import { Form } from './form';
import { IssueForm, type IssueDraft } from './form-example';

const meta = {
  title: 'Design System/Primitives/Fields/Form',
  component: Form,
  argTypes: kitArgTypes('Form'),
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj;

const filled: IssueDraft = {
  title: 'Sign-in sheet closes early',
  description:
    'On Android the sheet closes before the code arrives, so the person has to start again.',
  due: '2026-10-19',
  labels: ['bug'],
};

const states: {
  label: string;
  props: React.ComponentProps<typeof IssueForm>;
}[] = [
  { label: 'Rest', props: { onSubmit: () => {} } },
  { label: 'Filled', props: { initial: filled, onSubmit: () => {} } },
  {
    label: 'Invalid',
    props: { titleError: 'Enter a title.', onSubmit: () => {} },
  },
  {
    label: 'Submitting',
    props: { initial: filled, loading: true, onSubmit: () => {} },
  },
];

export const Variations: Story = {
  name: 'Form',
  render: () => (
    <VariationList>
      {states.map(({ label, props }) => (
        <Variation key={label} label={label}>
          <FormFrame {...props} />
        </Variation>
      ))}
    </VariationList>
  ),
};

// The desktop Form sits in a centred dialog, where Cancel joins the submit.
function FormFrame(
  props: React.ComponentProps<typeof IssueForm>,
): React.JSX.Element {
  return (
    <CentredOverlayScope>
      <View className="w-full max-w-md">
        <IssueForm {...props} onCancel={() => {}} />
      </View>
    </CentredOverlayScope>
  );
}
