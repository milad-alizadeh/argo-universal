import { iconSymbols as symbols } from '@repo/contracts/kit-symbols';
import type { SymbolSource } from './symbol-source';

export { iconNames } from '@repo/contracts/kit-symbols';

export type { IconName } from '@repo/contracts/kit-symbols';

export const iconSymbols = symbols satisfies Record<string, SymbolSource>;
