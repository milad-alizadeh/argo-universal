const LINK = /!?\[([^\]]{0,200})\]\([^)\s]{0,2000}(?: "[^"]{0,200}")?\)/g;

const REFERENCE_LINK = /\[([^\]]{1,200})\]\[[^\]]{0,50}\]/g;

const AUTOLINK = /<((?:https?:\/\/|mailto:)[^>\s]+)>/g;

const CODE_SPAN = /`([^`]+)`/g;

const BOLD = /(\*\*|__)([^*_]+)\1/g;

const ITALIC = /(?<![\w*])([*_])([^*_]+)\1(?![\w*])/g;

const STRIKE = /~~([^~]+)~~/g;

const BLOCK_PREFIX = /^\s*(?:#{1,6}|>|[-*+]|\d+[.)])\s+/;

const CHECKBOX = /^\[[ xX]\]\s+/;

const ABSOLUTE_PATH =
  /(?<![\w:/.~-])(?:~|\/(?:Users|home|tmp|var|private|opt))(?:\/[^\s/`'"()<>[\]]{1,255}){2,50}/g;

const TRAILING_PUNCTUATION = /[.,;:!?]{1,50}$/;

const WHITESPACE = /\s+/g;

export function activityText(markdown: string): string {
  const line =
    markdown.split('\n').find((candidate) => candidate.trim() !== '') ?? '';

  const text = line.replace(BLOCK_PREFIX, '').replace(CHECKBOX, '');

  return shortenPaths(stripInline(text)).replaceAll(WHITESPACE, ' ').trim();
}

function stripInline(text: string): string {
  return text
    .replaceAll(LINK, '$1')
    .replaceAll(REFERENCE_LINK, '$1')
    .replaceAll(AUTOLINK, '$1')
    .replaceAll(CODE_SPAN, '$1')
    .replaceAll(BOLD, '$2')
    .replaceAll(STRIKE, '$1')
    .replaceAll(ITALIC, '$2');
}

function shortenPaths(text: string): string {
  return text.replaceAll(ABSOLUTE_PATH, (path: string): string => {
    const trailing = TRAILING_PUNCTUATION.exec(path)?.[0] ?? '';
    const bare = path.slice(0, path.length - trailing.length);

    return `${bare.slice(bare.lastIndexOf('/') + 1)}${trailing}`;
  });
}
