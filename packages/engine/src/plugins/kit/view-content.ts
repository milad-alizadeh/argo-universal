import type { Page } from '@repo/contracts/plugins/argo-api';
import type { PluginEvent } from '@repo/contracts/plugins/wire';
import { createElement, type ReactNode } from 'react';
import { renderContext } from './render-context';

type Content = { pages: Map<string, Page> };

type Open = Extract<PluginEvent, { type: 'open' }>;

// Every page gets the surface of the Connection its view belongs to.
export function elementOf(content: Content, open: Open): ReactNode | null {
  const page = content.pages.get(open.path);

  return page ? createElement(page, { context: renderContext(open) }) : null;
}
