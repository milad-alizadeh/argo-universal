import { bytesHex, concatBytes, textBytes } from './bytes';

export interface MultipartBody {
  readonly contentType: string;
  readonly bytes: Uint8Array;
}

const boundaryBytes = 16;

// The escaping a browser gives a name inside a quoted header value.
const quoted = (name: string): string =>
  name.replaceAll('\n', '%0A').replaceAll('\r', '%0D').replaceAll('"', '%22');

function partHead(name: string, part: FormDataEntryValue): string {
  const disposition = `content-disposition: form-data; name="${quoted(name)}"`;

  if (typeof part === 'string') return `${disposition}\r\n\r\n`;

  return [
    `${disposition}; filename="${quoted(part.name)}"`,
    `content-type: ${part.type || 'application/octet-stream'}`,
    '\r\n',
  ].join('\r\n');
}

// Expo's native File reads like a web File without being one, so a file is whatever is not text.
const partBytes = async (part: FormDataEntryValue): Promise<Uint8Array> =>
  typeof part === 'string'
    ? textBytes(part)
    : new Uint8Array(await part.arrayBuffer());

/*
 * A form as the multipart bytes a Server reads. A browser's `Request` writes these itself; React Native's cannot read a form at all, so the channel writes them on every platform.
 */
export async function multipartBody(
  form: FormData,
  randomBytes: (length: number) => Uint8Array,
): Promise<MultipartBody> {
  const boundary = `----ArgoFormBoundary${bytesHex(randomBytes(boundaryBytes))}`;
  const pieces: Uint8Array[] = [];

  for (const [name, part] of form.entries())
    pieces.push(
      textBytes(`--${boundary}\r\n${partHead(name, part)}`),
      await partBytes(part),
      textBytes('\r\n'),
    );

  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    bytes: concatBytes(...pieces, textBytes(`--${boundary}--\r\n`)),
  };
}
