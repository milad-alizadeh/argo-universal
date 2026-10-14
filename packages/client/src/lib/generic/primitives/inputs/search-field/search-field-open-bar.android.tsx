import {
  BasicTextField,
  type BasicTextFieldProps,
  Box,
  RNHostView,
  Row,
  Text,
  useNativeState,
} from '@expo/ui/jetpack-compose';
import {
  fillMaxWidth,
  height,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '#primitives/buttons/icon-button';
import { Host } from '#primitives/native/host';
import { useComposeTextStyle } from '#primitives/native/native-typography';
import { useNativeTheme } from '../../../native-theme';

// Material's search view header: a 64dp row in place of the app bar.
const barHeight = 64;

export interface OpenSearchBarProps {
  label: string;
  // The query when search opened; the bar owns its text from then on.
  initialValue: string;
  onChangeText: (value: string) => void;
  onClose: () => void;
}

// The open search drawn as the screen's app bar, below the status bar.
export function OpenSearchHeader(props: OpenSearchBarProps): React.JSX.Element {
  const { top } = useSafeAreaInsets();

  return (
    <View className="bg-content" style={{ paddingTop: top }}>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <OpenSearchBarContent {...props} />
      </Host>
    </View>
  );
}

// Back, the focused field, and Clear once there is a query, as Compose content.
export function OpenSearchBarContent(
  props: OpenSearchBarProps,
): React.JSX.Element {
  const query = useQuery(props);

  return (
    <Row verticalAlignment="center" modifiers={barModifiers}>
      <BarButton {...backButton} onPress={props.onClose} />
      <QueryField {...query.field} label={props.label} />
      {query.hasText && <BarButton {...clearButton} onPress={query.clear} />}
    </Row>
  );
}

const barModifiers = [fillMaxWidth(), height(barHeight)];

const backButton = { icon: 'arrow-left', label: 'Close search' } as const;

const clearButton = { icon: 'close', label: 'Clear search' } as const;

type FieldValue = Pick<BasicTextFieldProps, 'value' | 'onValueChange'>;

interface Query {
  field: FieldValue;
  hasText: boolean;
  clear: () => void;
}

// The field's own text, so typing never waits on the screen; Clear empties both.
function useQuery(props: OpenSearchBarProps): Query {
  const text = useNativeState(props.initialValue);
  const [hasText, setHasText] = useState(props.initialValue !== '');

  const change = (value: string): void => {
    setHasText(value !== '');
    props.onChangeText(value);
  };

  const clear = (): void => {
    text.set('');
    change('');
  };

  return { field: { value: text, onValueChange: change }, hasText, clear };
}

// Argo's IconButton, hosted: a tap on a hosted icon never reaches a Compose button around it.
function BarButton({
  label,
  ...props
}: {
  icon: 'arrow-left' | 'close';
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <IconButton {...props} {...barButton} accessibilityLabel={label} />
    </RNHostView>
  );
}

const barButton = { variant: 'ghost', iconRole: 'action' } as const;

const fieldOptions = {
  autoFocus: true,
  singleLine: true,
  keyboardOptions: {
    capitalization: 'none',
    autoCorrectEnabled: false,
    imeAction: 'search',
  },
  modifiers: [weight(1)],
} satisfies Partial<BasicTextFieldProps>;

function QueryField({
  label,
  ...value
}: FieldValue & { label: string }): React.JSX.Element {
  return (
    <BasicTextField {...value} {...fieldOptions} {...useFieldText()}>
      <QueryDecoration label={label} />
    </BasicTextField>
  );
}

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

// The label in muted body text: the placeholder of the open field and of the bar at rest.
export function SearchLabel({ label }: { label: string }): React.JSX.Element {
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
