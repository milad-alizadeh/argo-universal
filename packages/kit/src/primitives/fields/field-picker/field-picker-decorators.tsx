import type { Decorator } from '@storybook/react-native-web-vite';
import type * as React from 'react';
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
