import type {
  PluginRenderContext,
  PluginSurface,
} from '@repo/contracts/plugins/kit';
import type { PluginEvent } from '@repo/contracts/plugins/wire';
import {
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from 'react';
import { jsx } from './jsx-runtime';
import type { PageRoutes } from './page-routes';

const PageContext = createContext<PluginRenderContext>({ serverDevice: false });

// The page's own `context`, for a component deep in the page that was not handed it.
export const usePageContext = (): PluginRenderContext =>
  useContext(PageContext);

type Content = { pages: PageRoutes };

type Open = Extract<PluginEvent, { type: 'open' }>;

type Writable<T> = { -readonly [Key in keyof T]: T[Key] };

type Context = Writable<PluginRenderContext>;

// The Project and Session the view opened for, each only when the App named it.
function withOpened(context: Context, { projectId, sessionId }: Open): Context {
  if (projectId !== undefined) context.projectId = projectId;

  if (sessionId !== undefined) context.sessionId = sessionId;

  return context;
}

// What a page reads from its context: its Connection and that Connection's surface, then what the view opened for.
function renderContext(open: Open): PluginRenderContext {
  const context: Context = { serverDevice: open.serverDevice === true };

  if (open.connectionId !== undefined) context.connectionId = open.connectionId;

  if (open.surface) context.surface = frozenSurface(open.surface);

  return withOpened(context, open);
}

// Every page gets the surface of the Connection its view belongs to, and the `:name` segments its path matched.
export function elementOf(content: Content, open: Open): ReactNode | null {
  const matched = content.pages.match(open.path);

  if (!matched) return null;

  const context = Object.freeze(renderContext(open));

  return createElement(
    PageContext.Provider,
    { value: context },
    createElement(matched.page, { context, params: matched.params }),
  );
}

// What a path with no page draws, so a stale link or a reload says so instead of waiting on a page that never comes.
export const notFoundElement = (): ReactNode =>
  jsx('Screen', {
    title: 'Not found',
    children: jsx('EmptyState', {
      title: "This page doesn't exist",
      description: 'Its link may be out of date.',
    }),
  });

function frozenSurface(surface: PluginSurface): Readonly<PluginSurface> {
  return Object.freeze({
    platform: surface.platform,
    wireVersion: surface.wireVersion,
  });
}
