import type { IconName } from './icon-names';
import type { SystemSymbolSource } from './symbol-source';

// An Argo icon name, or an SF and Material pair from outside the App's map, such as a Plugin's icon (ADR-0025).
export type IconSymbol = IconName | SystemSymbolSource;
