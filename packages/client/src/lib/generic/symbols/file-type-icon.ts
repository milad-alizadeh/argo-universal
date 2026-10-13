import type { IconName } from './icon-names';

// Native symbol sets have no per-language file icons, so extensions group by kind of content.
const extensionsByIcon: readonly (readonly [IconName, readonly string[]])[] = [
  [
    'file-code',
    [
      'c',
      'cpp',
      'cs',
      'css',
      'html',
      'htm',
      'js',
      'jsx',
      'py',
      'rs',
      'sql',
      'ts',
      'tsx',
      'vue',
    ],
  ],
  ['file-text', ['doc', 'docx', 'ini', 'md', 'markdown', 'txt']],
  ['file-image', ['jpg', 'jpeg', 'png', 'svg']],
  ['file-pdf', ['pdf']],
  ['file-slides', ['ppt', 'pptx']],
  ['file-table', ['csv', 'xls', 'xlsx']],
  ['file-zip', ['zip']],
];

const fileIcons = new Map(
  extensionsByIcon.flatMap(([icon, extensions]) =>
    extensions.map((extension) => [extension, icon] as const),
  ),
);

function extensionOf(path: string): string {
  const filename = path.split('/').at(-1) ?? '';
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(dot + 1).toLowerCase() : '';
}

export function fileTypeIcon(path: string): IconName {
  return fileIcons.get(extensionOf(path)) ?? 'file';
}
