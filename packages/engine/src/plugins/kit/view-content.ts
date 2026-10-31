import type { Page } from '@repo/contracts/plugins/argo-api';
import type {
  PluginRenderContext,
  PluginSurface,
} from '@repo/contracts/plugins/kit';
import type { PluginEvent } from '@repo/contracts/plugins/wire';
import { createElement, type ReactNode } from 'react';

type Content = { pages: Map<string, Page> };

type Open = Extract<PluginEvent, { type: 'open' }>;

type Writable<T> = { -readonly [Key in keyof T]: T[Key] };

type Context = Writable<PluginRenderContext>;

// The Project and Session the view opened for, each only when the App named it.
function withOpened(context: Context, { projectId, sessionId }: Open): Context {
  if (projectId !== undefined) context.projectId = projectId;

  if (sessionId !== undefined) context.sessionId = sessionId;

  return context;
}

// What a page reads from its context: the Connection's surface, then what the view opened for.
function renderContext(open: Open): PluginRenderContext {
  const context: Context = { serverDevice: open.serverDevice === true };

  if (open.surface) context.surface = frozenSurface(open.surface);

  return withOpened(context, open);
}

// Every page gets the surface of the Connection its view belongs to.
export function elementOf(content: Content, open: Open): ReactNode | null {
  const page = content.pages.get(open.path);
  const context = renderContext(open);

  return page ? createElement(page, { context: Object.freeze(context) }) : null;
}

function frozenSurface(surface: PluginSurface): Readonly<PluginSurface> {
  return Object.freeze({
    platform: surface.platform,
    wireVersion: surface.wireVersion,
  });
}
