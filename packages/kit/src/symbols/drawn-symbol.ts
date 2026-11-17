import type { AndroidSymbol } from 'expo-symbols';
import type { AppleSymbol } from './custom-symbols';
import type { SvgSymbolName } from './svg-symbols';
import type {
  MarkupSymbolSource,
  SvgSymbolSource,
  SymbolSource,
  SystemSymbolSource,
} from './symbol-source';

export interface SystemDrawing {
  kind: 'system';
  sf: AppleSymbol;
  material: AndroidSymbol;
  // The SF name drawn is a filled one, so Material draws its filled font too.
  filled: boolean;
}

export interface SvgDrawing {
  kind: 'svg';
  svg: SvgSymbolName;
}

export interface MarkupDrawing {
  kind: 'markup';
  markup: string;
}

// What an icon draws: SF on Apple platforms and Material elsewhere, one SVG component on every platform (ADR-0041), or a Plugin's own markup (ADR-0058).
export type DrawnSymbol = SystemDrawing | SvgDrawing | MarkupDrawing;

// A drawing of the icon's own: an SVG component or a Plugin's markup, the same on every platform.
export type OwnDrawing = SvgDrawing | MarkupDrawing;

const isSystemSource = (source: SymbolSource): source is SystemSymbolSource =>
  !('svg' in source) && !('markup' in source);

// A drawing a native surface such as a menu or a toolbar can show: only a system symbol.
export const isSystemDrawing = (drawn: DrawnSymbol): drawn is SystemDrawing =>
  drawn.kind === 'system';

const ownDrawing = (
  source: SvgSymbolSource | MarkupSymbolSource,
): OwnDrawing =>
  'svg' in source
    ? { kind: 'svg', svg: source.svg }
    : { kind: 'markup', markup: source.markup };

const drawnSf = (source: SystemSymbolSource, filled: boolean): AppleSymbol =>
  (filled && source.sfFilled) || source.sf;

// `materialFill` is false for a pair from outside the App's map: Argo's filled Material font holds only Argo's own icons (ADR-0019).
function systemDrawing(
  source: SystemSymbolSource,
  filled: boolean,
  materialFill: boolean,
): SystemDrawing {
  const sf = drawnSf(source, filled);
  const isFilled = materialFill && (sf !== source.sf || sf.endsWith('.fill'));

  return { kind: 'system', sf, material: source.material, filled: isFilled };
}

// An SVG or markup icon has one drawing, so a filled request draws it as it is.
export function drawnSymbol(
  source: SymbolSource,
  filled?: boolean,
  materialFill = true,
): DrawnSymbol {
  if (isSystemSource(source))
    return systemDrawing(source, filled === true, materialFill);

  return ownDrawing(source);
}
