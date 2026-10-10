import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  Variation,
  Variations,
} from '../../../../mocks/primitive-story-variations';
import { Alert, AlertDescription, AlertTitle } from './alert';

function VariantExamples() {
  return (
    <Variations>
      {(['default', 'destructive'] as const).map((variant) => (
        <Variation key={variant} label={variant}>
          <Alert variant={variant} icon="terminal">
            <AlertTitle>Heads up!</AlertTitle>
            <AlertDescription>
              You can add components to your app using the CLI.
            </AlertDescription>
          </Alert>
        </Variation>
      ))}
    </Variations>
  );
}
const meta = {
  title: 'Design System/Primitives/Alert',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Alert',
  render: VariantExamples,
};
