import type { IconName as IconVocabulary } from '@repo/contracts';
import { expectTypeOf } from 'vitest';
import type { IconName } from '#lib/generic/symbols/icon-names';

// The App draws exactly Argo's icon vocabulary, which Plugin manifests are validated against.
expectTypeOf<IconName>().toEqualTypeOf<IconVocabulary>();
