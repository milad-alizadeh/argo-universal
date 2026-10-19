import { z } from 'zod';
import {
  FetchCall,
  FetchReply,
  FsWrite,
  PluginFileEntry,
  PluginFileInfo,
  ProcessCommand,
  ProcessResult,
  SecretSet,
  StorageQuery,
  StorageResult,
} from './argo-calls';
import { PluginAssetRef, PluginAssetSource } from './assets';
import { PluginSettingValue } from './plugin-settings';
import { PluginProjectInfo } from './plugins';

/*
 * The Plugin API's calls to the Server: each method's arguments come from the call schema it sends, and
 * its answer from the schema the Server answers with. Pages, Slots and Hooks are added by the Plugin host.
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

// `json()` parses the body as the Plugin's own data.
export const FetchResponse = FetchReply.extend({
  headers: FetchReply.shape.headers.readonly(),
  text: z.function({ input: [], output: z.promise(z.string()) }),
  json: z.function({ input: [], output: z.promise(z.unknown()) }),
}).readonly();

const fileCalls = z
  .object({
    read: z.function({ input: [path], output: z.promise(z.string()) }),
    write: z.function({ input: [path, content], output: done }),
    list: z.function({
      input: [path],
      output: z.promise(z.array(PluginFileEntry)),
    }),
    stat: z.function({ input: [path], output: z.promise(PluginFileInfo) }),
  })
  .readonly();

const machineCalls = {
  assets: z
    .object({
      resolve: z.function({
        input: [PluginAssetSource],
        output: z.promise(PluginAssetRef),
      }),
    })
    .readonly(),
  fs: fileCalls,
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
};

const stateCalls = {
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
};

export const PluginApiCalls = z
  .object({ ...machineCalls, ...stateCalls })
  .readonly();

export type PluginApiCalls = z.infer<typeof PluginApiCalls>;
