import { z } from 'zod';
import {
  accountApiCalls,
  type AccountProviderRegistration,
} from './account-api';
import {
  FetchCall,
  FetchReply,
  FsWrite,
  PluginFileEntry,
  PluginFileInfo,
  PluginNavBadge,
  ProcessCommand,
  ProcessResult,
  SecretSet,
  StorageQuery,
  StorageResult,
} from './argo-calls';
import { PluginAssetRef, PluginAssetSource } from './assets';
import type { Hook, HookArgs, HookEventName } from './hooks';
import type { LoaderPagesApi } from './loader-page-api';
import type { OperationDeclarations, OperationsApi } from './operations-api';
import { PluginSettingValue } from './plugin-settings';
import type { QueriesApi } from './query-results';
import { sessionApiCalls } from './session-api';
import type { SlotsApi } from './slot-api';

export type { SlotItemsAnswer, SlotItemsProvider, SlotsApi } from './slot-api';

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
    ...accountApiCalls,
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
      output: z.promise(FetchResponse.nullable()),
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
    ...sessionApiCalls,
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

type ArgoCalls = Omit<PluginApiCalls, 'accounts'>;

/*
 * The Plugin API: the frozen `argo` object a Plugin's `register(argo)` receives, its only way out of
 * its worker (ADR-0027). Its calls are inferred from `PluginApiCalls`; `on` registers a Hook on one
 * core event.
 */
export type Argo<Operations = OperationDeclarations> = ArgoCalls &
  Readonly<{
    accounts: PluginApiCalls['accounts'] & AccountProviderRegistration;
    pages: LoaderPagesApi<Operations>;
    slots: SlotsApi;
    operations: OperationsApi<Operations>;
    queries: QueriesApi;
    /*
     * Says what the Plugin's pages and items Slots show may have changed, after a write that is not an
     * Operation or a change it heard of elsewhere (an Operation's run says so itself): every Query the
     * Plugin's Loaders read, its paged-list pages among them, is due, every connected App draws its open
     * Loader pages again, and open items Slot lists ask again.
     */
    changed: () => void;
    on: <Name extends HookEventName>(
      name: Name,
      ...args: HookArgs<Hook<Name, Operations>>
    ) => Promise<void>;
  }>;
