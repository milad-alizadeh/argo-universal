import {
  BasicTextField,
  type BasicTextFieldProps,
  Box,
  Text,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { Host } from '#primitives/native/host';
import { useComposeTextStyle } from '#primitives/native/native-typography';
import { useNativeTheme } from '../../../native-theme';

export type FieldValue = Pick<BasicTextFieldProps, 'value' | 'onValueChange'>;

// The whole width the title had, so the query starts where the title's text did.
const fieldHostStyle = { width: '100%' } as const;

// The open search's focused field, in the app bar's title place.
export function AppBarSearchField({
  label,
  ...value
}: FieldValue & { label: string }): React.JSX.Element {
  return (
    <Host matchContents={{ vertical: true }} style={fieldHostStyle}>
      <BasicTextField {...value} {...fieldOptions} {...useFieldText()}>
        <QueryDecoration label={label} />
      </BasicTextField>
    </Host>
  );
}

const fieldOptions = {
  autoFocus: true,
  singleLine: true,
  keyboardOptions: {
    capitalization: 'none',
    autoCorrectEnabled: false,
    imeAction: 'search',
  },
  modifiers: [fillMaxWidth()],
} satisfies Partial<BasicTextFieldProps>;

function QueryDecoration({ label }: { label: string }): React.JSX.Element {
  return (
    <BasicTextField.DecorationBox>
      <Box contentAlignment="centerStart" modifiers={[fillMaxWidth()]}>
        <BasicTextField.Placeholder>
          <SearchLabel label={label} />
        </BasicTextField.Placeholder>
        <BasicTextField.InnerTextField />
      </Box>
    </BasicTextField.DecorationBox>
  );
}

// The body text in the foreground colour, the cursor in the same colour.
function useFieldText(): Pick<
  BasicTextFieldProps,
  'cursorColor' | 'textStyle'
> {
  const { foreground } = useNativeTheme().colors;

  return {
    cursorColor: foreground,
    textStyle: { ...useSearchTypography(), color: foreground },
  };
}

// The label in muted body text: the open field's placeholder.
function SearchLabel({ label }: { label: string }): React.JSX.Element {
  const { mutedForeground } = useNativeTheme().colors;

  return (
    <Text color={mutedForeground} style={useSearchTypography()}>
      {label}
    </Text>
  );
}

// The body text style, without the alignment a Compose text field does not take.
function useSearchTypography(): Pick<
  ReturnType<typeof useComposeTextStyle>,
  'fontFamily' | 'fontSize' | 'lineHeight' | 'fontWeight'
> {
  const { fontFamily, fontSize, lineHeight, fontWeight } =
    useComposeTextStyle('body');

  return { fontFamily, fontSize, lineHeight, fontWeight };
}
