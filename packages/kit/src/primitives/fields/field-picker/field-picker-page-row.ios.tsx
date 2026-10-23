/* oxlint-disable anti-slop/no-shape-in-symbol-names, argo/icon-size -- SwiftUI's own modifier names, and the stock Settings disclosure chevron as FieldLink draws it. */
import { Button, HStack, Image, Spacer } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  contentShape,
  disabled,
  font,
  foregroundStyle,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import type { ModifierConfig } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement, ReactNode } from 'react';
import { NativeText } from '#primitives/content/native-text';
import { RowTitle } from '#primitives/fields/field-row';

type PageRowProps = {
  title: string;
  leading: React.ComponentProps<typeof RowTitle>['leading'];
  summary: string;
  disabled?: boolean;
  onPress?: () => void;
  // The Sheet this row opens when no enclosing Sheet holds the page, drawn into the row's own tree.
  sheet?: ReactNode;
};

// Settings' disclosure: chevron.forward at footnote size, semibold, in the tertiary label colour.
const disclosureStyle = [
  font({ textStyle: 'footnote', weight: 'semibold' }),
  foregroundStyle({ type: 'hierarchical', style: 'tertiary' }),
];

/*
 * What SwiftUI's `.navigationLink` Picker draws: the title, the chosen value in the muted tone and the disclosure
 * chevron, because pressing it pushes a page. The content shape lets the whole row take the press.
 */
export function PageRow(props: PageRowProps): ReactElement {
  return (
    <Button onPress={props.onPress} modifiers={pressing(props.disabled)}>
      <HStack modifiers={[contentShape(shapes.rectangle())]}>
        <RowTitle title={props.title} leading={props.leading} />
        <Spacer />
        <NativeText tone="muted">{props.summary}</NativeText>
        <Image systemName="chevron.forward" modifiers={disclosureStyle} />
        {props.sheet}
      </HStack>
    </Button>
  );
}

const pressing = (off: boolean | undefined): ModifierConfig[] => [
  buttonStyle('plain'),
  disabled(off ?? false),
];
