import type * as React from 'react';
import { type ThemeChoice, themeChoices } from '#features/settings';
import { List, ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { Page } from '#primitives/scaffolds/page';

export interface AppearanceDetailViewProps {
  theme: ThemeChoice;
  onThemeChange: (theme: ThemeChoice) => void;
  // What System follows on this Device, such as "macOS" or "iOS".
  systemSource: string;
}

// Paper "Settings Desktop · Appearance": one Theme row, a Picker (#412 D5), with what System follows below it.
export function AppearanceDetailView(
  props: AppearanceDetailViewProps,
): React.JSX.Element {
  return (
    <Page title="Appearance">
      <List appearance="grouped">
        <ListSection footer={`System follows ${props.systemSource}.`}>
          <ThemeRow {...props} />
        </ListSection>
      </List>
    </Page>
  );
}

function ThemeRow(props: AppearanceDetailViewProps): React.JSX.Element {
  return (
    <ListItem.Picker
      title="Theme"
      value={props.theme}
      options={themeChoices}
      onValueChange={props.onThemeChange}
    />
  );
}
