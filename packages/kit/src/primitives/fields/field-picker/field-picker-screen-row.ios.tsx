import { Button, HStack, Image, Spacer, VStack } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  contentShape,
  disabled,
  font,
  foregroundStyle,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { useEnlargedText } from '#kit/enlarged-text';
import { NativeText } from '#primitives/content/native-text';
import { RowTitle } from '#primitives/fields/field-row';
import type { PickerRowProps } from './field-picker-kind';

type ScreenRowProps = PickerRowProps;

// Settings' disclosure: chevron.forward at footnote size, semibold, in the tertiary label colour.
const disclosureStyle = [
  font({ textStyle: 'footnote', weight: 'semibold' }),
  foregroundStyle({ type: 'hierarchical', style: 'tertiary' }),
];

// The whole row takes the press, not only its content.
export const wholeRowPress = contentShape(shapes.rectangle());

/*
 * What SwiftUI's `.navigationLink` Picker draws: the title, the chosen value in the muted tone and the disclosure
 * chevron, because pressing it pushes a page. The content shape lets the whole row take the press.
 */
export function ScreenRow(props: ScreenRowProps): ReactElement {
  return (
    <Button
      onPress={props.onPress}
      modifiers={[buttonStyle('plain'), disabled(props.disabled ?? false)]}
    >
      <HStack modifiers={[wholeRowPress]}>
        <TitleAndSummary {...props} />
        <Image systemName="chevron.forward" modifiers={disclosureStyle} />
      </HStack>
    </Button>
  );
}

/*
 * The title and the chosen value share the row's width side by side, until the text is enlarged: then the value goes
 * under the title, as stock Settings stacks them, so neither is squeezed to a few letters or broken mid-word.
 */
function TitleAndSummary(props: ScreenRowProps): ReactElement {
  const enlarged = useEnlargedText();
  const title = <RowTitle {...titleProps(props)} />;
  const summary = <NativeText tone="muted">{props.summary}</NativeText>;

  return enlarged ? stacked(title, summary) : beside(title, summary);
}

const stacked = (title: ReactElement, summary: ReactElement): ReactElement => (
  <>
    <VStack alignment="leading">
      {title}
      {summary}
    </VStack>
    <Spacer />
  </>
);

const beside = (title: ReactElement, summary: ReactElement): ReactElement => (
  <>
    {title}
    <Spacer />
    {summary}
  </>
);

// The chosen option's logo leads the row where it has one, the row's own icon otherwise.
const titleProps = (
  props: ScreenRowProps,
): React.ComponentProps<typeof RowTitle> => ({
  title: props.title,
  leading: props.leading,
  logo: props.logo,
});
