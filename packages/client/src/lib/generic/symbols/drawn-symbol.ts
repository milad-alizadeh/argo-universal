import type { AndroidSymbol } from 'expo-symbols';
import type { AppleSymbol } from './custom-symbols';
import type {
  SymbolSource,
  SystemSymbolSource,
  TablerSymbolSource,
} from './symbol-source';
import type { TablerSymbol } from './tabler-symbols';

export interface SystemDrawing {
  kind: 'system';
  sf: AppleSymbol;
  material: AndroidSymbol;
  // The SF name drawn is a filled one, so Material draws its filled font too.
  filled: boolean;
}

export interface TablerDrawing {
  kind: 'tabler';
  tabler: TablerSymbol;
}

// What an icon draws: SF on Apple platforms and Material elsewhere, or one Tabler path on every platform (ADR-0019).
export type DrawnSymbol = SystemDrawing | TablerDrawing;

function isTablerSource(source: SymbolSource): source is TablerSymbolSource {
  return 'tabler' in source;
}

const drawnSf = (source: SystemSymbolSource, filled: boolean): AppleSymbol =>
  (filled && source.sfFilled) || source.sf;

function systemDrawing(
  source: SystemSymbolSource,
  filled: boolean,
): SystemDrawing {
  const sf = drawnSf(source, filled);
  const isFilled = sf !== source.sf || sf.endsWith('.fill');

  return { kind: 'system', sf, material: source.material, filled: isFilled };
}

// A Tabler icon has one path, so a filled request draws it as it is.
export function drawnSymbol(
  source: SymbolSource,
  filled?: boolean,
): DrawnSymbol {
  if (isTablerSource(source)) return { kind: 'tabler', tabler: source.tabler };

  return systemDrawing(source, filled === true);
}

// A pair from outside the App's map draws outlined: Argo's filled Material font holds only Argo's own icons (ADR-0019).
export function outlinedDrawing(source: SystemSymbolSource): SystemDrawing {
  return {
    kind: 'system',
    sf: source.sf,
    material: source.material,
    filled: false,
  };
}
