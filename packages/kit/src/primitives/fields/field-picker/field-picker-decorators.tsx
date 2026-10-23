import type { Decorator } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { FieldGroup } from '#primitives/fields/field-group';
import { withPageStack } from '#story-stack';

// A row's stories draw it as the one row of a FieldGroup section, where Expo UI draws it.
export const inFieldGroupSection: Decorator = (Story): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section title="Section">
      <Story />
    </FieldGroup.Section>
  </FieldGroup>
);

// Decorators run innermost first: the row in its section, on the screen's Page, as the root of a stack.
export const inSection = [inFieldGroupSection];

export const inStackedSection = [inFieldGroupSection, withPageStack()];

export const inStackedPage = [withPageStack()];

// A toolbar holds its pill at the pill's own width, at the start of a row.
const inToolbarRow: Decorator = (Story): React.JSX.Element => (
  <View className="flex-row">
    <Story />
  </View>
);

/*
 * A stack's pages fill their parent, and the story preview centres its story, so a stack alone collapses to no width
 * and a pill in it loses its label: the stack takes the preview's width.
 */
const fillingWidth: Decorator = (Story): React.JSX.Element => (
  <View className="w-full">
    <Story />
  </View>
);

export const inStackedToolbar = [inToolbarRow, withPageStack(), fillingWidth];
