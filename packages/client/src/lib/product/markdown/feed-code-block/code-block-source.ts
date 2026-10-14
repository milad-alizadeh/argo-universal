interface CodeBlockResource {
  name: string;
  uri: string;
  description?: string;
}

export type CodeBlockSource =
  | { code: string; resource?: never; uri?: never; description?: never }
  | {
      code?: string;
      resource: CodeBlockResource;
      uri?: never;
      description?: never;
    }
  // A resource with its URI as the header and its text, or else its description, as the body.
  | { code?: string; uri: string; description?: string; resource?: never };

interface CopyAction {
  value: string;
  label: string;
}

function resourceUri({ resource, uri }: CodeBlockSource): string | undefined {
  return resource?.uri ?? uri;
}

function resourceCopy(code: string | undefined, uri: string): CopyAction {
  return code === undefined
    ? { value: uri, label: 'Copy URI' }
    : { value: code, label: 'Copy resource text' };
}

// A resource copies its text, or its URI when it has none; plain code copies the code.
export function copyAction(source: CodeBlockSource): CopyAction {
  const uri = resourceUri(source);

  if (uri !== undefined) return resourceCopy(source.code, uri);

  return { value: source.code ?? '', label: 'Copy code' };
}

function sourceTitle({ resource, uri }: CodeBlockSource): string | undefined {
  return resource?.name ?? uri;
}

export function headerTitle(
  source: CodeBlockSource,
  language: string | undefined,
): string {
  return sourceTitle(source) ?? language ?? '';
}

export function hasBody({ code, description }: CodeBlockSource): boolean {
  return code !== undefined || !!description;
}
