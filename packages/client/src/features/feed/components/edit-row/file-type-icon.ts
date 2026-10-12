import type { IconName } from '#lib/generic/symbols/icon-names';

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

export function fileTypeIcon(path: string): IconName {
  const filename = path.split('/').at(-1) ?? '';
  const dot = filename.lastIndexOf('.');
  const extension = dot > 0 ? filename.slice(dot + 1).toLowerCase() : '';
  return fileIcons.get(extension) ?? 'file';
}
