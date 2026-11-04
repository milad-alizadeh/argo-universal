import type {
  PluginRenderContext,
  PluginSurface,
} from '@repo/contracts/plugins/kit';

// What the App opened a page for, from the Connection that asked: a Loader page's `draw` or a Replaceable Slot's `render`.
export type Opened = {
  serverDevice?: boolean;
  surface?: PluginSurface;
  projectId?: string;
  sessionId?: string;
};

type Writable<T> = { -readonly [Key in keyof T]: T[Key] };

type Context = Writable<PluginRenderContext>;

// What a page reads from its context: the Connection's surface, then what the page opened for.
export function renderContext(opened: Opened): PluginRenderContext {
  const context: Context = { serverDevice: opened.serverDevice === true };

  if (opened.surface) context.surface = frozenSurface(opened.surface);

  return Object.freeze(withOpened(context, opened));
}

// The Project and Session the page opened for, each only when the App named it.
function withOpened(
  context: Context,
  { projectId, sessionId }: Opened,
): Context {
  if (projectId !== undefined) context.projectId = projectId;

  if (sessionId !== undefined) context.sessionId = sessionId;

  return context;
}

function frozenSurface(surface: PluginSurface): Readonly<PluginSurface> {
  return Object.freeze({
    platform: surface.platform,
    wireVersion: surface.wireVersion,
  });
}
