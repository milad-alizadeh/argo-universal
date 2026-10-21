import { Metadata } from './metadata';
import type { MetadataProps } from './metadata-props';
import { fields } from './metadata.mocks';

const longPath =
  '~/Developer/argo-universal/packages/kit/src/primitives/scaffolds/metadata';

export const readOnlyFieldsMetadata = { ...fields } satisfies MetadataProps;

export const longPathMetadata = {
  children: <Metadata.Label title="Path" text={longPath} />,
} satisfies MetadataProps;
