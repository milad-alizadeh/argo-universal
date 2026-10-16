import type { materialSymbolNames } from '@repo/contracts/plugins/material-symbol-names';
import type { sfSymbolNames } from '@repo/contracts/plugins/sf-symbol-names';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

// Plain assignability both ways: vitest's toEqualTypeOf takes minutes on unions of thousands of names.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// Plugin manifests are checked against exactly the names expo-symbols draws; regenerate the lists after an expo-symbols bump.
true satisfies Same<(typeof sfSymbolNames)[number], SFSymbol>;

true satisfies Same<(typeof materialSymbolNames)[number], AndroidSymbol>;
