import type {
  ContentBlock as AcpContentBlock,
  TextResourceContents,
} from '@agentclientprotocol/sdk';
import type {
  ContentBlock,
  EmbeddedResource,
  ResourceLink,
  UnsupportedContent,
} from '@repo/contracts';

export const createAcpContentMetadata = (
  metadata: AcpContentBlock['_meta'],
): { acp: NonNullable<AcpContentBlock['_meta']> } | undefined =>
  metadata == null ? undefined : { acp: metadata };
const firstPrintableAscii = 32;
const deleteAscii = 127;
const hasControlCharacters = (uri: string): boolean =>
  uri
    .split('')
    .some(
      (character) =>
        character.charCodeAt(0) < firstPrintableAscii ||
        character.charCodeAt(0) === deleteAscii,
    );
const isInertReference = (uri: string): boolean =>
  /^(https?:|file:)/.test(uri) && !hasControlCharacters(uri);
const hasReferenceCredentials = (reference: URL): boolean =>
  Boolean(reference.username || reference.password);
const parseInertReference = (uri: string): string | undefined => {
  try {
    const parsed = new URL(uri);
    return hasReferenceCredentials(parsed) ? undefined : uri;
  } catch {
    return undefined;
  }
};
const readInertReference = (
  uri: string | null | undefined,
): string | undefined => {
  if (uri == null) return undefined;
  return isInertReference(uri) ? parseInertReference(uri) : undefined;
};
export const unsupportedContent = (
  contentKind: string,
  reason: string,
  uri?: string | null,
): UnsupportedContent => ({
  type: 'unsupported',
  contentKind,
  reason,
  reference: readInertReference(uri),
});
type AcpResourceLink = Extract<AcpContentBlock, { type: 'resource_link' }>;
const readResourceDisplayDetails = (
  block: AcpResourceLink,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries({
      mimeType: block.mimeType,
      title: block.title,
      description: block.description,
      size: block.size,
    }).filter(([, value]) => value != null),
  );
const mapResourceLink = (block: AcpResourceLink): ResourceLink => ({
  type: 'resource_link',
  name: block.name,
  uri: block.uri,
  ...readResourceDisplayDetails(block),
  _meta: createAcpContentMetadata(block._meta),
});
const mapTextResource = (
  resource: TextResourceContents,
): EmbeddedResource['resource'] => ({
  uri: resource.uri,
  text: resource.text,
  mimeType: resource.mimeType ?? undefined,
  _meta: createAcpContentMetadata(resource._meta),
});
type AcpEmbeddedResource = Extract<AcpContentBlock, { type: 'resource' }>;
const mapBinaryResource = (block: AcpEmbeddedResource): UnsupportedContent => ({
  ...unsupportedContent(
    'resource',
    'Binary resource output requires stored Blob materialization',
    block.resource.uri,
  ),
  _meta: createAcpContentMetadata(block._meta),
});
const mapEmbeddedResource = (
  block: Extract<AcpContentBlock, { type: 'resource' }>,
): EmbeddedResource | UnsupportedContent => {
  if ('text' in block.resource)
    return {
      type: 'resource',
      resource: mapTextResource(block.resource),
      _meta: createAcpContentMetadata(block._meta),
    };
  return mapBinaryResource(block);
};
const mapUnmaterializedImage = (
  block: Extract<AcpContentBlock, { type: 'image' }>,
): UnsupportedContent => ({
  ...unsupportedContent(
    'image',
    'Image output requires stored Blob materialization',
    block.uri,
  ),
  _meta: createAcpContentMetadata(block._meta),
});
type AcpMediaBlock = Exclude<
  AcpContentBlock,
  { type: 'text' | 'resource_link' }
>;
const mapMediaOrEmbeddedContent = (block: AcpMediaBlock): ContentBlock => {
  if (block.type === 'resource') return mapEmbeddedResource(block);
  if (block.type === 'image') return mapUnmaterializedImage(block);
  return {
    ...unsupportedContent('audio', 'Audio output is not supported'),
    _meta: createAcpContentMetadata(block._meta),
  };
};
export const mapSupportedContentBlock = (
  block: AcpContentBlock,
): ContentBlock => {
  if (block.type === 'text')
    return {
      type: 'text',
      text: block.text,
      _meta: createAcpContentMetadata(block._meta),
    };
  if (block.type === 'resource_link') return mapResourceLink(block);
  return mapMediaOrEmbeddedContent(block);
};

export const unsupportedContentReasons = (content: ContentBlock[]): string[] =>
  content.flatMap((block) =>
    block.type === 'unsupported' ? [block.reason] : [],
  );
