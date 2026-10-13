// The schemes Argo follows a link to; any other link keeps its text and goes nowhere.
const linkProtocols = new Set(['http:', 'https:', 'mailto:']);

// Whether text is a whole URL Argo follows: a pasted one links the selection, a drawn one opens.
export function isLinkUrl(text: string): boolean {
  if (/\s/.test(text) || !URL.canParse(text)) return false;
  return linkProtocols.has(new URL(text).protocol);
}
