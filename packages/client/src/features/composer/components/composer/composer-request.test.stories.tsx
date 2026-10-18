import type { Meta } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { ReplaceableSlotRenderer } from '#lib/product/plugin-registry/replaceable-slot';
import { SessionLayout } from '#lib/product/session-layout';
import { Text } from '#primitives/content/text';
import { preservesComposer } from '../../../../../mocks/composer/request-composer.test.mocks';
import { Composer } from './composer';

const meta = {
  title: 'Tests/Composer/Requests',
  component: Composer,
  parameters: { screenPreview: true },
  decorators: [
    (Story): React.JSX.Element => (
      <SessionLayout
        header={<View />}
        feed={<View className="flex-1" />}
        composer={<Story />}
      />
    ),
  ],
  render: function EditableComposer(args): React.JSX.Element {
    const [draft, setDraft] = useState(args.draft);

    return <Composer {...args} draft={draft} onDraftChange={setDraft} />;
  },
} satisfies Meta<typeof Composer>;

export default meta;

export const ClaudePermissionKeepsComposer = preservesComposer(0);

export const CodexPermissionKeepsComposer = preservesComposer(1);

const permissionWithReplacement = preservesComposer(0);

const replacementTray = (): React.JSX.Element => <Text>Plugin tray</Text>;

export const ReplacementKeepsPermission = {
  ...permissionWithReplacement,
  decorators: [
    (Story): React.JSX.Element => (
      <ReplaceableSlotRenderer value={replacementTray}>
        <Story />
      </ReplaceableSlotRenderer>
    ),
  ],
  play: async (context): Promise<void> => {
    await permissionWithReplacement.play?.(context);
    await expect(context.canvas.getByText('Plugin tray')).toBeVisible();
  },
} satisfies typeof permissionWithReplacement;
