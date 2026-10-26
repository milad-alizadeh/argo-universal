import type { ReactElement } from 'react';
import { Text } from 'react-native';
import type { CentredModalTextProps } from './centred-modal-props';

export function CentredModalTitle(props: CentredModalTextProps): ReactElement {
  return (
    <Text role="heading" aria-level={2} className={props.className}>
      {props.children}
    </Text>
  );
}

export function CentredModalDescription(
  props: CentredModalTextProps,
): ReactElement {
  return <Text className={props.className}>{props.children}</Text>;
}
