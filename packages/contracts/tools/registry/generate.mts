import { writeFile } from 'node:fs/promises';
import registrySchema from '../../src/agents/upstream/registry.schema.json' with { type: 'json' };

const upstreamCommit = '2d9e3f082c49182fb7abd3b9f8c545c9b32c6db2';

const outputUrl = new URL(
  '../../src/agents/upstream/registry.published.schema.gen.json',
  import.meta.url,
);

// The published registry always carries `"extensions": []`, which the upstream schema omits; only that empty list is accepted.
const schema = {
  ...registrySchema,
  properties: {
    ...registrySchema.properties,
    extensions: { type: 'array', const: [], maxItems: 0 },
  },
  $comment: `Derived from official registry schema at ${upstreamCommit}. Only the published empty extensions list is added.`,
};

await writeFile(outputUrl, `${JSON.stringify(schema, null, 2)}\n`);
