import { Label } from '@expo/ui/swift-ui';
import { foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#kit/native-theme';
import { NativeText } from '#primitives/content/native-text';
import { drawnSymbol } from '../../../symbols/drawn-symbol';
import { type IconSymbol, resolveIcon } from '../../../symbols/icon-symbol';
import { nativeIconName } from '../../../symbols/native-icon-name';
import { NativeSymbol } from '../../../symbols/native-symbol';
import { RowLogo } from './field-row-logo';
import type { RowTextProps } from './field-row-text';

type RowTitleProps = RowTextProps & { title: string };

/*
 * The title as SwiftUI draws it in a stock row: a plain Text, or a Label with its icon. A row is one line; its
 * explanation goes in its Section's footer, as iOS Settings does.
 */
export function RowTitle(props: RowTitleProps): ReactElement {
  const icon = labelIcon(props);
  const tint = useDangerStyle(props.tone);

  // A logo is the Label's icon too, so its title starts where the other rows' titles do.
  if (props.logo)
    return (
      <Label
        title={props.title}
        icon={<RowLogo logo={props.logo} title={props.title} />}
        modifiers={tint}
      />
    );

  if (icon) return <Label title={props.title} {...icon} modifiers={tint} />;

  return <NativeText tone={props.tone}>{props.title}</NativeText>;
}

// A Label's title is a plain string, so the destructive tone colours the whole label.
function useDangerStyle(
  tone: RowTextProps['tone'],
): ReturnType<typeof foregroundStyle>[] {
  const color = useNativeTheme().colors.danger;

  return tone === 'danger' && color ? [foregroundStyle(color)] : [];
}

type LabelIcon = Pick<LabelProps, 'systemImage' | 'icon'>;

/*
 * A row's leading icon as the Label takes it: a system SF Symbol by name, Argo's own symbol (`custom.robot`, an
 * asset-catalog image) as the Label's icon view, at the size nearest the Label's body font so it matches a system
 * symbol. An SVG icon has no symbol, so the row draws none.
 */
function labelIcon(props: RowTextProps): LabelIcon | undefined {
  if (!props.leading) return undefined;

  const name = nativeIconName(props.leading);

  return typeof name === 'string'
    ? { systemImage: name }
    : customIcon(props.leading);
}

function customIcon(leading: IconSymbol): LabelIcon | undefined {
  const drawn = drawnSymbol(resolveIcon(leading).symbol);

  return drawn.kind === 'svg'
    ? undefined
    : { icon: <NativeSymbol name={leading} /> };
}

type LabelProps = React.ComponentProps<typeof Label>;
