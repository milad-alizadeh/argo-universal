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
): PluginRenderContext {
  return surface
    ? {
        surface: Object.freeze({
          platform: surface.platform,
          wireVersion: surface.wireVersion,
        }),
      }
    : {};
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
  { path, slot, surface }: Open,
): ReactNode | null {
  const context = renderContext(surface);

  if (slot) return slotElement(content, slot, context);
  const page = content.pages.get(path);

  return page ? createElement(page, { context: Object.freeze(context) }) : null;
}
