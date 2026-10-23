import type { Decorator } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { FieldGroup } from '#primitives/fields/field-group';
import { Page } from '#primitives/scaffolds/page';
import { withStack } from '#story-stack';

// A row's stories draw it as the one row of a FieldGroup section, where Expo UI draws it.
export const inFieldGroupSection: Decorator = (Story): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section title="Section">
      <Story />
    </FieldGroup.Section>
  </FieldGroup>
);

// The screen the picker sits on; a phone's stack draws its header and pushes the picker's page over it.
const inSettingsPage: Decorator = (Story): React.JSX.Element => (
  <Page title="Settings">
    <Story />
  </Page>
);

// Decorators run innermost first: the row, in its section, on a page, as the root of a navigation stack.
export const inSection = [inFieldGroupSection];

export const inStackedSection = [
  inFieldGroupSection,
  inSettingsPage,
  withStack(),
];

export const inStackedPage = [inSettingsPage, withStack()];
