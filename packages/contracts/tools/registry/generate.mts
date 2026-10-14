import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import registrySchema from '../../src/agents/upstream/registry.schema.json' with { type: 'json' };

const producerDigest =
  'ac3e7008ccccdb42852bc9e3780d46078cfaf9e0f92c39d59427d3294eb12207';

const producerCommit = '33a1a101ef68ab20a97624ac89d4b977eeac0daf';

const producerUrl = new URL('./upstream/build_registry.py', import.meta.url);

const outputUrl = new URL(
  '../../src/agents/upstream/registry.published.schema.gen.json',
  import.meta.url,
);

const placeholderPattern = /"(extensions)"\s*:\s*(\[\s*\])/u;

// The producer publishes `extensions` only as this literal empty list.
const EmptyExtensions = z.tuple([]);

interface Placeholder {
  name: string;
  value: z.infer<typeof EmptyExtensions>;
}

async function readVerifiedRegistryProducer(): Promise<string> {
  const source = await readFile(producerUrl);
  const digest = createHash('sha256').update(source).digest('hex');

  if (digest !== producerDigest)
    throw new Error(
      'Registry producer SHA-256 does not match its pinned source',
    );

  return source.toString('utf8');
}

function extractPublishedExtensionsPlaceholder(
  producerSource: string,
): Placeholder {
  const matches = [
    ...producerSource.matchAll(new RegExp(placeholderPattern, 'gu')),
  ];

  if (matches.length !== 1)
    throw new Error('Expected one published empty extensions placeholder');
  const [match] = matches;

  if (!match) throw new Error('Registry producer placeholder is missing');

  return parseExtensionsPlaceholderMatch(match);
}

function parseExtensionsPlaceholderMatch(
  placeholderMatch: RegExpMatchArray,
): Placeholder {
  const [, name, literal] = placeholderMatch;

  if (!name || !literal)
    throw new Error('Registry producer placeholder is incomplete');

  return requireEmptyExtensionsPlaceholder(name, literal);
}

function requireEmptyExtensionsPlaceholder(
  extensionName: string,
  literal: string,
): Placeholder {
  const extensions = EmptyExtensions.safeParse(JSON.parse(literal));

  if (!extensions.success)
    throw new Error('Nonempty registry extension semantics are unsupported');

  return { name: extensionName, value: extensions.data };
}

// The published schema's JSON text.
function derivePublishedRegistrySchema({ name, value }: Placeholder): string {
  const schema = {
    ...registrySchema,
    properties: {
      ...registrySchema.properties,
      [name]: { type: 'array', const: value, maxItems: value.length },
    },
    $comment: `Derived from official registry schema and producer ${producerCommit}; producer SHA-256 ${producerDigest}. Only its literal empty extensions placeholder is added.`,
  };

  return JSON.stringify(schema, null, 2);
}

const placeholder = extractPublishedExtensionsPlaceholder(
  await readVerifiedRegistryProducer(),
);

await writeFile(outputUrl, `${derivePublishedRegistrySchema(placeholder)}\n`);
