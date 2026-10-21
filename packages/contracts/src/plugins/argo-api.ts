import type { ComponentType } from 'react';
import { z } from 'zod';
import {
  FetchCall,
  FetchReply,
  FsWrite,
  PluginFileEntry,
  PluginFileInfo,
  PluginProjectInfo,
  PluginNavBadge,
  ProcessCommand,
  ProcessResult,
  SecretSet,
  StorageQuery,
  StorageResult,
} from './argo-calls';
import { PluginAssetRef, PluginAssetSource } from './assets';
import type { Hook, HookArgs, HookEventName } from './hooks';
import type { PluginRenderContext } from './kit';
import { PluginSettingValue } from './plugin-settings';
import type { PluginSlotInput, SlotId } from './wire';

/*
 * The Plugin API's calls to the Server: each method's arguments come from the call schema it sends, and
 * its answer from the schema the Server answers with.
 */
const { path, content } = FsWrite.shape;

const { account, value } = SecretSet.shape;

const command = z.tuple([
  ProcessCommand.shape.argv,
  ProcessCommand.omit({ argv: true }).optional(),
]);

const done = z.promise(z.void());

export const PluginProcess = z
  .object({
    wait: z.function({ input: [], output: z.promise(ProcessResult) }),
    kill: z.function({ input: [], output: done }),
  })
  .readonly();

export type PluginProcess = z.infer<typeof PluginProcess>;

// `json()` parses the body as the Plugin's own data, so it is `unknown` until the Plugin checks it.
export const FetchResponse = FetchReply.extend({
  headers: FetchReply.shape.headers.readonly(),
  text: z.function({ input: [], output: z.promise(z.string()) }),
  json: z.function({ input: [], output: z.promise(z.unknown()) }),
}).readonly();

export type FetchResponse = z.infer<typeof FetchResponse>;

export const PluginApiCalls = z
  .object({
    nav: z
      .object({
        badge: z.function({
          input: [PluginNavBadge.shape.id, PluginNavBadge.shape.count],
          output: done,
        }),
      })
      .readonly(),
    assets: z
      .object({
        resolve: z.function({
          input: [PluginAssetSource],
          output: z.promise(PluginAssetRef),
        }),
      })
      .readonly(),
    fs: z
      .object({
        read: z.function({ input: [path], output: z.promise(z.string()) }),
        write: z.function({ input: [path, content], output: done }),
        list: z.function({
          input: [path],
          output: z.promise(z.array(PluginFileEntry)),
        }),
        stat: z.function({ input: [path], output: z.promise(PluginFileInfo) }),
      })
      .readonly(),
    process: z
      .object({
        run: z.function({ input: command, output: z.promise(ProcessResult) }),
        spawn: z.function({ input: command, output: z.promise(PluginProcess) }),
      })
      .readonly(),
    fetch: z.function({
      input: [FetchCall.shape.url, FetchCall.omit({ url: true }).optional()],
      output: z.promise(FetchResponse),
    }),
    storage: z
      .object({
        batch: z.function({
          input: [z.array(StorageQuery)],
          output: z.promise(z.array(StorageResult)),
        }),
        execute: z.function({
          input: [StorageQuery],
          output: z.promise(StorageResult),
        }),
      })
      .readonly(),
    projects: z
      .object({
        list: z.function({
          input: [],
          output: z.promise(z.array(PluginProjectInfo)),
        }),
      })
      .readonly(),
    secrets: z
      .object({
        get: z.function({
          input: [account],
          output: z.promise(account.nullable()),
        }),
        set: z.function({ input: [account, value], output: done }),
        delete: z.function({ input: [account], output: done }),
      })
      .readonly(),
    settings: z
      .object({
        get: z.function({
          input: [z.string()],
          output: z.promise(PluginSettingValue.nullable()),
        }),
      })
      .readonly(),
  })
  .readonly();

type PluginApiCalls = z.infer<typeof PluginApiCalls>;

export type Page = ComponentType<{ context: PluginRenderContext }>;

export type SlotContent = ComponentType<{
  context: PluginSlotInput['context'] & PluginRenderContext;
}>;

/*
 * The Plugin API: the frozen `argo` object a Plugin's `register(argo)` receives, its only way out of
 * its worker (ADR-0027). Its calls are inferred from `PluginApiCalls`; `on` registers a Hook on one
 * core event.
 */
export type Argo = PluginApiCalls &
  Readonly<{
    pages: Readonly<{ register: (path: string, page: Page) => void }>;
    slots: Readonly<{
      register: (slotId: SlotId, content: SlotContent) => void;
    }>;
    on: <Name extends HookEventName>(
      name: Name,
      ...args: HookArgs<Hook<Name>>
    ) => Promise<void>;
  }>;
