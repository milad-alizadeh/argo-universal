import type { Page, SlotContent } from '@repo/contracts/plugins/argo-api';
import type {
  PluginRenderContext,
  PluginSurface,
} from '@repo/contracts/plugins/kit';
import type {
  PluginEvent,
  PluginSlotInput,
} from '@repo/contracts/plugins/wire';
import { createElement, type ReactNode } from 'react';

type Content = { pages: Map<string, Page>; slots: Map<string, SlotContent> };

type Open = Extract<PluginEvent, { type: 'open' }>;

type Writable<T> = { -readonly [Key in keyof T]: T[Key] };

type Context = Writable<PluginRenderContext>;

// The Project and Session the view opened for, each only when the App named it.
function withOpened(context: Context, { projectId, sessionId }: Open): Context {
  if (projectId !== undefined) context.projectId = projectId;

  if (sessionId !== undefined) context.sessionId = sessionId;

  return context;
}

// What a page or Slot reads from its context: the Connection's surface, then what the view opened for.
function renderContext(open: Open): PluginRenderContext {
  const context: Context = { serverDevice: open.serverDevice === true };

  if (open.surface) context.surface = frozenSurface(open.surface);

  return withOpened(context, open);
}

function slotElement(
  content: Content,
  slot: PluginSlotInput,
  context: PluginRenderContext,
): ReactNode | null {
  const component = content.slots.get(slot.slotId);

  return component
    ? createElement(component, {
        context: Object.freeze({ ...slot.context, ...context }),
      })
    : null;
}

// Every page and Slot gets the surface of the Connection its view belongs to.
export function elementOf(content: Content, open: Open): ReactNode | null {
  const { path, slot } = open;
  const context = renderContext(open);

  if (slot) return slotElement(content, slot, context);
  const page = content.pages.get(path);

  return page ? createElement(page, { context: Object.freeze(context) }) : null;
}

function frozenSurface(surface: PluginSurface): Readonly<PluginSurface> {
  return Object.freeze({
    platform: surface.platform,
    wireVersion: surface.wireVersion,
  });
}
