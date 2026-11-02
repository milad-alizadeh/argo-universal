import type { TextRole } from './text-props';

/*
 * The words a Text with nothing to say draws inside a loading Skeleton, such as a name whose value has not
 * arrived yet. They are never shown: the Skeleton measures the line they lay out and draws a bar over it, so what is
 * written here is a width, as long as the role usually runs.
 */
export const skeletonWords = {
  title: 'A placeholder title',
  heading: 'Placeholder heading',
  body: 'Placeholder words of a body line',
  'body-code': 'placeholder/path.ts',
  'title-code': '000 \u00b7 000',
  secondary: 'Placeholder detail',
  'secondary-code': 'placeholder.ts',
  control: 'Placeholder',
  badge: '00',
  code: 'placeholder.ts',
  'nav-title': 'Placeholder title',
  'nav-action': 'Action',
  row: 'A placeholder row',
  'row-detail': 'Detail',
} as const satisfies Record<TextRole, string>;
