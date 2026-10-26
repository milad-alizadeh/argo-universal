import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactElement } from 'react';
import { Text } from 'react-native';
import type { CentredModalTextProps } from './centred-modal-props';

export function CentredModalTitle(props: CentredModalTextProps): ReactElement {
  return (
    <RadixDialog.Title asChild>
      <Text className={props.className}>{props.children}</Text>
    </RadixDialog.Title>
  );
}

export function CentredModalDescription(
  props: CentredModalTextProps,
): ReactElement {
  return (
    <RadixDialog.Description asChild>
      <Text className={props.className}>{props.children}</Text>
    </RadixDialog.Description>
  );
}
