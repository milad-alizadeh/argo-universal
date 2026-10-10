import type { NativeSymbol } from './native-symbol';

// Files, folders and repositories.
export const fileSymbols = {
  'changed-files': { sf: 'doc.badge.plus', material: 'note_add' },
  directory: { sf: 'folder.circle', material: 'topic' },
  file: { sf: 'doc', material: 'draft' },
  'file-code': { sf: 'curlybraces', material: 'data_object' },
  'file-image': { sf: 'photo', material: 'image' },
  'file-pdf': { sf: 'doc.richtext', material: 'feed' },
  'file-slides': { sf: 'play.rectangle', material: 'slideshow' },
  'file-table': { sf: 'tablecells', material: 'table' },
  'file-text': { sf: 'doc.text', material: 'description' },
  'file-zip': { sf: 'archivebox', material: 'inventory_2' },
  folder: { sf: 'folder', material: 'folder' },
  'folder-open': { sf: 'folder.fill', material: 'folder_open' },
  folders: { sf: 'rectangle.stack', material: 'folder_copy' },
  registry: { sf: 'doc.plaintext', material: 'article' },
  repository: { sf: 'book.closed', material: 'book' },
} as const satisfies Record<string, NativeSymbol>;
