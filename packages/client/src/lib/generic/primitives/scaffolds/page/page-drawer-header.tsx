import type { PageHeaderInput } from './page-props';

// Only Android's drawer draws a root page's header; iOS and the web keep the stack's, so their Pages are never marked.
export function PageDrawerHeader(_props: PageHeaderInput): null {
  return null;
}
