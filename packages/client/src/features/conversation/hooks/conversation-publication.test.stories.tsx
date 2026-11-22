import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import {
  conversationPublication,
  ConversationPublicationPreview,
} from './conversation-publication.mocks';

const meta = {
  title: 'Tests/Conversation/ConversationPublication',
} satisfies Meta;

export default meta;

export const ShowsConversationWhileStatusReadIsPending: StoryObj<typeof meta> =
  {
    play: async ({ mount }) => {
      const publication = conversationPublication();

      const canvas = await mount(
        <ConversationPublicationPreview fixture={publication} />,
      );

      await publication.reading;
      await expect(
        canvas.queryByTestId('conversation-band'),
      ).not.toBeInTheDocument();
      await expect(
        canvas.queryByTestId('listed-conversation'),
      ).not.toBeInTheDocument();

      publication.publish();

      await expect(await canvas.findByText('Connecting…')).toBeVisible();
      await expect(
        await canvas.findByTestId('listed-conversation'),
      ).toBeVisible();
    },
  };
