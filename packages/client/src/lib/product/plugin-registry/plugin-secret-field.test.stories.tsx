import { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fireEvent, fn, waitFor } from 'storybook/test';
import { PluginTree, type OnPageCall } from './plugin-registry';

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/SecretField',
  beforeEach: (): void => {
    answer = Promise.withResolvers<void>();
    onPageCall.mockClear();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const token = 'pasted-api-token-41c9';

// A sign-in page: the SecretField's text goes to the secret `token` param of `saveToken` (ADR-0051).
const root = WireNode.parse({
  type: 'FieldGroup',
  key: 'form',
  props: {},
  slots: {},
  children: [
    {
      type: 'FieldGroup.Section',
      key: 'section',
      props: {},
      slots: {},
      children: [
        {
          type: 'FieldGroup.SecretField',
          key: 'token',
          props: {
            title: 'API token',
            value: '',
            onChangeText: {
              operation: 'saveToken',
              args: { token: { $payload: true } },
            },
          },
          children: [],
          slots: {},
        },
      ],
    },
  ],
});

const kept = JSON.stringify(root);

// The Operation's answer.
let answer = Promise.withResolvers<void>();

const onPageCall = fn<OnPageCall>(() => answer.promise);

/*
 * The typed token runs the Operation, and once it has answered and the field is let go the App holds the token
 * nowhere: not in the field, and not in the tree it keeps.
 */
export const ForgetsTheTokenOnceTheRunAnswers: Story = {
  render: () => <PluginTree root={root} onPageCall={onPageCall} />,
  play: async ({ canvas }) => {
    const input = await canvas.findByLabelText('API token');

    input.focus();
    await fireEvent.change(input, { target: { value: token } });
    await waitFor(() =>
      expect(onPageCall).toHaveBeenCalledWith(
        { operation: 'saveToken', args: { token } },
        expect.objectContaining({ key: 'form/section/token' }),
      ),
    );
    await expect(input).toHaveValue(token);

    answer.resolve();
    input.blur();

    await waitFor(() => expect(input).toHaveValue(''));
    await expect(JSON.stringify(root)).toBe(kept);
    await expect(document.body.innerHTML).not.toContain(token);
  },
};
