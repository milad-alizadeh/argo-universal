import { Label } from '@expo/ui/swift-ui';
import { foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#kit/native-theme';
import { NativeText } from '#primitives/content/native-text';
import { nativeIconName } from '../../../symbols/native-icon-name';
import type { RowTextProps } from './field-row-text';

type RowTitleProps = RowTextProps & { title: string };

/*
 * The title as SwiftUI draws it in a stock row: a plain Text, or a Label with its icon. A row is one line; its
 * explanation goes in its Section's footer, as iOS Settings does.
 */
export function RowTitle(props: RowTitleProps): ReactElement {
  const symbol = leadingSymbol(props);
  const tint = useDangerStyle(props.tone);

  if (symbol)
    return <Label title={props.title} systemImage={symbol} modifiers={tint} />;

  return <NativeText tone={props.tone}>{props.title}</NativeText>;
}

// A Label's title is a plain string, so the destructive tone colours the whole label.
function useDangerStyle(
  tone: RowTextProps['tone'],
): ReturnType<typeof foregroundStyle>[] {
  const color = useNativeTheme().colors.danger;

  return tone === 'danger' && color ? [foregroundStyle(color)] : [];
}

// The SF Symbol of a row's leading icon; a name with no system symbol draws none.
function leadingSymbol(props: RowTextProps): SfSymbol | undefined {
  const name = props.leading ? nativeIconName(props.leading) : undefined;

  return typeof name === 'string' ? name : undefined;
}

type SfSymbol = NonNullable<React.ComponentProps<typeof Label>['systemImage']>;
