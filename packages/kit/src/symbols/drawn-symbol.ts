import type { AndroidSymbol } from 'expo-symbols';
import type { AppleSymbol } from './custom-symbols';
import type { SvgSymbolName } from './svg-symbols';
import type {
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

// What an icon draws: SF on Apple platforms and Material elsewhere, or one SVG component on every platform (ADR-0041).
export type DrawnSymbol = SystemDrawing | SvgDrawing;

function isSvgSource(source: SymbolSource): source is SvgSymbolSource {
  return 'svg' in source;
}

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

// An SVG icon has one drawing, so a filled request draws it as it is.
export function drawnSymbol(
  source: SymbolSource,
  filled?: boolean,
  materialFill = true,
): DrawnSymbol {
  if (isSvgSource(source)) return { kind: 'svg', svg: source.svg };

  return systemDrawing(source, filled === true, materialFill);
}
