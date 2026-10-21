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

function renderContext(
  surface: PluginSurface | undefined,
  projectId: string | undefined,
  serverDevice: boolean,
): PluginRenderContext {
  const context = surface
    ? { serverDevice, surface: frozenSurface(surface) }
    : { serverDevice };

  return projectId === undefined ? context : { ...context, projectId };
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
export function elementOf(
  content: Content,
  { path, slot, surface, projectId, serverDevice }: Open,
): ReactNode | null {
  const context = renderContext(surface, projectId, serverDevice === true);

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
