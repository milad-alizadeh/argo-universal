import { z } from 'zod';
import { productCompatibility } from '../product-identity';

const acpMetadata = z.record(z.string(), z.unknown()).optional();

type FeedMetadataSchema<Extension extends z.ZodObject> = z.ZodOptional<
  z.ZodObject<
    { argo: z.ZodOptional<Extension>; acp: typeof acpMetadata },
    z.core.$strict
  >
>;

export const createFeedMetadataSchema = <Extension extends z.ZodObject>(
  extensionSchema: Extension,
): FeedMetadataSchema<Extension> =>
  z
    .strictObject({
      [productCompatibility.feedMetadata]: extensionSchema.optional(),
      acp: acpMetadata,
    })
    .optional();
