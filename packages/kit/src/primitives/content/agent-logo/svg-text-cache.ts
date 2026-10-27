const loaded = new Map<string, string>();

const pending = new Map<string, Promise<string>>();

const base64Prefix = 'data:image/svg+xml;base64,';

// A base64 data URI is decoded here, as react-native-svg's own fetch does; React Native's fetch does not read data URIs.
const decodeBase64 = (uri: string): string =>
  atob(decodeURIComponent(uri.slice(base64Prefix.length)));

const readable = (response: Response, uri: string): boolean =>
  response.ok || (response.status === 0 && uri.startsWith('file://'));

function textOf(uri: string, response: Response): Promise<string> {
  if (!readable(response, uri))
    throw new Error(`Fetching ${uri} failed with status ${response.status}`);

  return response.text();
}

async function fetchSvgText(uri: string): Promise<string> {
  if (uri.startsWith(base64Prefix)) return decodeBase64(uri);

  return textOf(uri, await fetch(uri));
}

// The SVG text of a URI already fetched, so a row that mounts again draws its logo in its first render instead of after a fetch.
export const cachedSvgText = (uri: string): string | undefined =>
  loaded.get(uri);

const keep =
  (uri: string) =>
  (text: string): string => {
    pending.delete(uri);
    loaded.set(uri, text);

    return text;
  };

const drop =
  (uri: string) =>
  (error: Error): never => {
    pending.delete(uri);

    throw error;
  };

/*
 * react-native-svg's SvgUri keeps what it fetched in each instance's state, so a logo whose row a list unmounted and mounted
 * again was blank until it fetched again. This keeps the text for the app's lifetime and shares one fetch between the
 * logos asking for it at once; a failed fetch is forgotten, so the next mount tries again.
 */
export function loadSvgText(uri: string): Promise<string> {
  const text = loaded.get(uri);

  if (text !== undefined) return Promise.resolve(text);

  const inFlight =
    pending.get(uri) ?? fetchSvgText(uri).then(keep(uri), drop(uri));

  pending.set(uri, inFlight);

  return inFlight;
}

export function forgetSvgTexts(): void {
  loaded.clear();
  pending.clear();
}
