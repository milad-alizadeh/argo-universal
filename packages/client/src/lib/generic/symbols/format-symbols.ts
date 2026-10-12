import type { SymbolSource } from './symbol-source';

// Text marks and blocks a person formats a message with.
export const formatSymbols = {
  bold: { sf: 'bold', material: 'format_bold' },
  italic: { sf: 'italic', material: 'format_italic' },
  link: { sf: 'link', material: 'link' },
  'list-bullet': { sf: 'list.bullet', material: 'format_list_bulleted' },
  'list-number': { sf: 'list.number', material: 'format_list_numbered' },
  quote: { sf: 'text.quote', material: 'format_quote' },
  strikethrough: { sf: 'strikethrough', material: 'format_strikethrough' },
  underline: { sf: 'underline', material: 'format_underlined' },
} as const satisfies Record<string, SymbolSource>;
