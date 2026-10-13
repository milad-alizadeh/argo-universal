import type { Meta } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { SessionLayout } from '#lib/product/session-layout';
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
export const ClaudePlanKeepsComposer = preservesComposer(0, 'plan');
export const CodexPlanKeepsComposer = preservesComposer(1, 'plan');
export const ClaudePermissionKeepsComposer = preservesComposer(0, 'permission');
export const CodexPermissionKeepsComposer = preservesComposer(1, 'permission');
