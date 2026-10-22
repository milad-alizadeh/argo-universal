import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Icon, IconSpinner } from '#primitives/content/icon';
import type { IconSize } from '../../../symbols/icon-size';
import type { IconSymbol } from '../../../symbols/icon-symbol';
import type { LogoSource } from '../../../symbols/logo-source';

// The icon or spinner a pressable button draws, hidden from assistive tech: IconButton's glyph.

interface AdornmentProps {
  icon?: IconSymbol;
  source?: LogoSource;
  loading?: boolean;
  textClass: string;
  // ActivityIndicator takes its colour from an `accent-*` class, so the spinner carries the label colour as one.
  spinnerClass: string;
  size: IconSize;
  filled?: boolean;
}

type Glyph = { source: LogoSource } | { name: IconSymbol };

function glyphOf({ icon, source }: AdornmentProps): Glyph | undefined {
  if (source) return { source };

  return icon ? { name: icon } : undefined;
}

export function ButtonAdornment(props: AdornmentProps): ReactElement | null {
  const glyph = glyphOf(props);

  if (!props.loading && !glyph) return null;

  return <HiddenAdornment>{adornment(props, glyph)}</HiddenAdornment>;
}

function adornment(
  props: AdornmentProps,
  glyph: Glyph | undefined,
): ReactElement {
  if (props.loading || !glyph)
    return (
      <IconSpinner colorClassName={props.spinnerClass} iconSize={props.size} />
    );

  return <AdornmentIcon {...props} glyph={glyph} />;
}

function AdornmentIcon(props: AdornmentProps & { glyph: Glyph }): ReactElement {
  return (
    <Icon
      {...props.glyph}
      size={props.size}
      filled={props.filled}
      className={props.textClass}
    />
  );
}

function HiddenAdornment({
  children,
}: {
  children: ReactElement;
}): ReactElement {
  return (
    <View
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {children}
    </View>
  );
}
