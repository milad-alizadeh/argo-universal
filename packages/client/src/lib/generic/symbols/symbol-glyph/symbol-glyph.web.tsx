import { type SFSymbol, SymbolView } from 'expo-symbols';
import type * as React from 'react';
import { cn } from '../../utils';
import {
  customSymbolBox,
  customSymbolImage,
  isCustomSymbol,
} from '../custom-symbols';
import {
  type RenderSymbolImage,
  useSymbolImage,
  useSymbolImageRenderer,
} from '../symbol-images';
import type { SymbolGlyphProps } from './symbol-glyph';
import { symbolWeight } from './symbol-weight';

/*
 * SF Symbols draw like text: every symbol in a role at one point size, the one that makes `circle` fill
 * `referenceShare` of the role's box, so narrow symbols such as chevrons stay narrow. A symbol larger than `circle`
 * shrinks to `circle`'s size, so wide ones such as the Sessions bubbles keep to the box.
 */
const referenceSymbol = 'circle';
// Leaves `circle`'s ink at three quarters of the box: 18 points on the rail, 12 beside Body text.
const referenceShare = 0.88;
// `circle` is this wide in 100-point type, the units of Argo's custom symbol paths.
const referenceSymbolCustomUnits = 117;

/*
 * The desktop app on macOS draws SF Symbols from the system and Argo's custom symbols from their paths; the browser
 * and other desktops draw Material Symbols.
 */
export function SymbolGlyph({
  sf,
  material,
  filled,
  pixels,
  colorClassName,
  testID,
}: SymbolGlyphProps): React.JSX.Element {
  const render = useSymbolImageRenderer();
  return (
    // data-icon lets a parent style the icons inside it, as `has-[>[data-icon]]` does on Button.
    <span
      data-icon
      data-testid={testID}
      aria-hidden
      className={cn(colorClassName, '[&>div]:text-inherit!')}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: pixels,
        height: pixels,
        userSelect: 'none',
        fontWeight: 'normal',
        fontStyle: 'normal',
        fontSynthesis: 'none',
      }}
    >
      {render ? (
        <AppleSymbolImage render={render} sf={sf} pixels={pixels} />
      ) : (
        <SymbolView
          key={String(filled)}
          name={{ web: material }}
          size={pixels}
          weight={symbolWeight(filled)}
          tintColor="currentColor"
        />
      )}
    </span>
  );
}

interface AppleSymbolImageProps extends Pick<
  SymbolGlyphProps,
  'sf' | 'pixels'
> {
  render: RenderSymbolImage;
}

function AppleSymbolImage({
  render,
  sf,
  pixels,
}: AppleSymbolImageProps): React.JSX.Element {
  if (isCustomSymbol(sf)) {
    const { width, height } = customSymbolBox(sf);
    const scale =
      (pixels * referenceShare) /
      Math.max(referenceSymbolCustomUnits, width, height);
    return (
      <SymbolMask
        url={customSymbolImage(sf)}
        width={width * scale}
        height={height * scale}
      />
    );
  }
  return <MaskedSymbol render={render} sf={sf} pixels={pixels} />;
}

interface MaskedSymbolProps extends Pick<SymbolGlyphProps, 'pixels'> {
  render: RenderSymbolImage;
  sf: SFSymbol;
}

// The system image is the mask and the text colour fills it, so the symbol follows colour like the other icons.
function MaskedSymbol({
  render,
  sf,
  pixels,
}: MaskedSymbolProps): React.JSX.Element | null {
  const pointSize = Math.round(pixels * globalThis.devicePixelRatio);
  const image = useSymbolImage(render, { name: sf, pointSize });
  const reference = useSymbolImage(render, {
    name: referenceSymbol,
    pointSize,
  });
  if (!image || !reference) return null;
  const scale =
    (pixels * referenceShare) /
    Math.max(reference.width, reference.height, image.width, image.height);
  return (
    <SymbolMask
      url={image.url}
      width={image.width * scale}
      height={image.height * scale}
    />
  );
}

interface SymbolMaskProps {
  url: string;
  width: number;
  height: number;
}

// Centred in the icon's box.
function SymbolMask({
  url,
  width,
  height,
}: SymbolMaskProps): React.JSX.Element {
  const mask = `url("${url}") center / 100% 100% no-repeat`;
  return (
    <span
      style={{
        display: 'block',
        flexShrink: 0,
        width,
        height,
        backgroundColor: 'currentColor',
        mask,
        WebkitMask: mask,
      }}
    />
  );
}
