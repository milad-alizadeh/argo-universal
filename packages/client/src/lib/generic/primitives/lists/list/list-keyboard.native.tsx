import type { ReactElement, ReactNode } from 'react';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { FormFocusScope } from '../../../form-focus';

const flexible = { flex: 1 };

const fitted = { flexShrink: 1 };

export function ListKeyboard({
  children,
  fit,
}: {
  children: ReactNode;
  fit?: boolean;
}): ReactElement {
  return (
    <KeyboardAvoidingView behavior="padding" style={fit ? fitted : flexible}>
      <FormFocusScope>{children}</FormFocusScope>
    </KeyboardAvoidingView>
  );
}
