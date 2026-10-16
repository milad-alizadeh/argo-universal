import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface Keychain {
  get(service: string, account: string): Promise<string | null>;
  set(service: string, account: string, value: string): Promise<void>;
  delete(service: string, account: string): Promise<void>;
}

const itemNotFound = 44;

const notFound = (error: Error): boolean =>
  'code' in error && error.code === itemNotFound;

// A missing item is an answer, not a failure.
function security(args: string[]): Promise<string | null> {
  return execFileAsync('security', args).then(
    ({ stdout }) => stdout,
    (error: Error): null => {
      if (notFound(error)) return null;
      throw error;
    },
  );
}

const decode = (stored: string | null): string | null =>
  stored === null
    ? null
    : Buffer.from(stored.trim(), 'base64').toString('utf8');

// Values are stored base64-encoded so any text survives the `security` CLI's output rules.
export const macKeychain: Keychain = {
  get: (service, account) =>
    security([
      'find-generic-password',
      '-s',
      service,
      '-a',
      account,
      '-w',
    ]).then(decode),
  set: async (service, account, value) => {
    const encoded = Buffer.from(value, 'utf8').toString('base64');

    await security([
      'add-generic-password',
      '-U',
      '-s',
      service,
      '-a',
      account,
      '-w',
      encoded,
    ]);
  },
  delete: async (service, account) => {
    await security(['delete-generic-password', '-s', service, '-a', account]);
  },
};

export const pluginKeychainService = (pluginId: string): string =>
  `argo.plugin.${pluginId}`;
