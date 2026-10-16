import type { materialSymbolNames } from '@repo/contracts/plugins/material-symbol-names';
import type { sfSymbolNames } from '@repo/contracts/plugins/sf-symbol-names';
import type { AndroidSymbol } from 'expo-symbols';
import type { SFSymbols4_1 } from 'sf-symbols-typescript';

// vitest's toEqualTypeOf takes minutes on unions of thousands of names, so this checks plain assignability both ways.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// The lists must stay what expo-symbols draws on the oldest supported systems; regenerate them after an expo-symbols bump.
true satisfies Same<(typeof sfSymbolNames)[number], SFSymbols4_1>;

true satisfies Same<(typeof materialSymbolNames)[number], AndroidSymbol>;
