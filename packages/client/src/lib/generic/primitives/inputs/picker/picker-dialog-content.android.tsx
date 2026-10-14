import { Column, Row, Text, TextButton } from '@expo/ui/jetpack-compose';
import {
  defaultMinSize,
  fillMaxWidth,
  padding,
} from '@expo/ui/jetpack-compose/modifiers';
import { createElement } from 'react';

const titleBottom = 16;

const inset = 24;

const footerHeight = 48;

export function DialogTitle(props: { label: string }): React.JSX.Element {
  return (
    <Column modifiers={[padding(inset, 0, inset, titleBottom)]}>
      <Text style={{ typography: 'headlineSmall' }}>{props.label}</Text>
    </Column>
  );
}

export function DialogCancel(props: {
  onClose: () => void;
}): React.JSX.Element {
  return createElement(
    Row,
    cancelRowProps(),
    <TextButton onClick={props.onClose}>
      <Text>Cancel</Text>
    </TextButton>,
  );
}

function cancelRowProps(): React.ComponentProps<typeof Row> {
  return {
    horizontalArrangement: 'end',
    verticalAlignment: 'center',
    modifiers: [
      fillMaxWidth(),
      defaultMinSize({ minHeight: footerHeight }),
      padding(inset, 0, inset, 0),
    ],
  };
}
