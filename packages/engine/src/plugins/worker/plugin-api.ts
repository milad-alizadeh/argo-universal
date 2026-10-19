import type { PluginApiCalls } from '@repo/contracts/plugins/argo-api';
import type { SlotId } from '@repo/contracts/plugins/wire';
import type { Page, SlotContent } from '../kit/view-content';
import type { PluginRequest } from '../protocol/runtime';
import type { HookRegistrar } from './hook-types';

export type {
  Hook,
  HookContext,
  HookNext,
  HookOptions,
  HookRegistrar,
} from './hook-types';

export type ArgoRequest<Api extends PluginRequest['api']> = Extract<
  PluginRequest,
  { api: Api }
>;

/*
 * The Plugin API: the frozen `argo` object a Plugin's `register(argo)` receives, its only way out of
 * its worker (ADR-0027). Its calls to the Server are inferred from `PluginApiCalls` in Contracts; the
 * kit adds pages and Slots, and the Hook dispatcher adds `on`.
 */
export type Argo = PluginApiCalls &
  Readonly<{
    pages: Readonly<{ register: (path: string, page: Page) => void }>;
    slots: Readonly<{
      register: (slotId: SlotId, content: SlotContent) => void;
    }>;
    on: HookRegistrar;
  }>;
