import type { TablerSymbol } from './tabler-symbols';

export type { SystemSymbolSource } from '@repo/contracts/kit-symbols';

import type { SystemSymbolSource } from '@repo/contracts/kit-symbols';

// A git icon: one Tabler path, drawn on every platform (ADR-0019), so it has no SF or Material name.
export interface TablerSymbolSource {
  tabler: TablerSymbol;
}

export type SymbolSource = SystemSymbolSource | TablerSymbolSource;
