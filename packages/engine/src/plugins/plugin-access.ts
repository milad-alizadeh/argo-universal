import { mkdir, realpath } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import {
  isSpecialHost,
  type FetchCapability,
  type PluginCapability,
  type ProcessCapability,
} from '@repo/contracts/plugins';
import { CapabilityRefusal } from './capability-refusal';
import {
  allowLinks,
  allowRead,
  allowWrite,
  argsMatch,
  childEnvironment,
  realOrMissing,
  resolveReal,
  type Roots,
  type Subject,
} from './plugin-access-rules';
import { allowLiteral } from './plugin-addresses';
import type { ProcessCommand } from './runtime-protocol';

// What the Server holds for an activated Plugin: its Grants, and its code folder, which `argo.fs` never writes.
export type ActivatedPlugin = {
  grants: readonly PluginCapability[];
  codeFolder: string;
};

export type AccessScope = {
  // The Capabilities allowed to the Plugin; empty for a Plugin never activated.
  grants: readonly PluginCapability[];
  // null for a Plugin never activated.
  codeFolder: string | null;
  // `<home>/plugin-data/<id>/`, the only folder a Plugin writes (ADR-0030).
  dataFolder: string;
  // The registered Projects' folders, which any Plugin may read.
  projects: () => Promise<readonly string[]>;
};

export type FileAccess = 'read' | 'write';

// What a command runs with once checked: its working directory resolved and its whole environment.
export type CheckedCommand = ProcessCommand & {
  cwd: string;
  env: Record<string, string>;
};

// A fetch hop the Capabilities allow; `private` is true only for a raw address or `localhost` declared with a reason.
export type HostRule = { private: boolean };

/*
 * The one checker for a Plugin's `argo.fs`, `argo.process` and `argo.fetch` calls (ADR-0030).
 * Deny beats allow, and nothing beyond the manifest is granted.
 */
export class PluginAccess {
  constructor(private readonly scope: AccessScope) {}

  // Resolves symlinks and `..` before checking, so the answer is about the real file.
  async checkPath(path: string, access: FileAccess): Promise<string> {
    if (!isAbsolute(path))
      throw new CapabilityRefusal(`${path} is not an absolute path`);

    const target = await resolveReal(resolve(path));

    await this.allowPath({ target, shown: path }, access, 1);

    return target;
  }

  /*
   * Checks a path, and again once its file is open with that file's link count: a swap after the
   * first check gains nothing, and a hard link in the data folder can't reach a file elsewhere.
   */
  async allowPath(
    subject: Subject,
    access: FileAccess,
    links: number,
  ): Promise<void> {
    const roots = await this.roots();

    (access === 'write' ? allowWrite : allowRead)(subject, roots);
    allowLinks(subject, roots, links);
  }

  async checkCommand(command: ProcessCommand): Promise<CheckedCommand> {
    const matching = this.matching(command.argv);

    if (matching.length === 0)
      throw new CapabilityRefusal(
        `${command.argv.join(' ')} is not a declared command`,
      );

    return {
      ...command,
      cwd: await this.workingDirectory(command.cwd),
      env: childEnvironment(command.env ?? {}, matching),
    };
  }

  checkHost(url: URL): HostRule {
    if (url.protocol !== 'https:')
      throw new CapabilityRefusal(`${url.protocol} is not HTTPS`);

    const capabilities = this.fetchCapabilities();
    const exact = capabilities.find(({ host }) => host === url.host);

    const rule = exact ? exactHost(exact) : anyHost(capabilities, url);

    allowLiteral(url, rule);

    return rule;
  }

  private matching(argv: readonly string[]): ProcessCapability[] {
    const [program = '', ...args] = argv;

    return this.processCapabilities().filter(
      (capability) =>
        capability.command === program && argsMatch(capability.args, args),
    );
  }

  // A command runs in the data folder unless it names a folder in the data folder or a Project.
  private async workingDirectory(cwd: string | undefined): Promise<string> {
    if (cwd === undefined) return this.makeDataFolder();

    if (!isAbsolute(cwd))
      throw new CapabilityRefusal(`${cwd} is not an absolute path`);

    const target = await realpath(resolve(cwd)).catch((): never => {
      throw new CapabilityRefusal(`${cwd} is not a folder`);
    });

    allowRead({ target, shown: cwd }, await this.roots());

    return target;
  }

  // The data folder, created if it is missing; its path is the Server's, never the Plugin's.
  async makeDataFolder(): Promise<string> {
    await mkdir(this.scope.dataFolder, { recursive: true });

    return realpath(this.scope.dataFolder);
  }

  private async roots(): Promise<Roots> {
    const [data, code, projects] = await Promise.all([
      resolveReal(this.scope.dataFolder),
      this.scope.codeFolder === null
        ? null
        : realOrMissing(this.scope.codeFolder),
      this.scope
        .projects()
        .then((paths) => Promise.all(paths.map(realOrMissing))),
    ]);

    return { data, code, projects: projects.filter((path) => path !== null) };
  }

  private processCapabilities(): ProcessCapability[] {
    return this.scope.grants.filter(
      (capability) => capability.kind === 'process:exec',
    );
  }

  private fetchCapabilities(): FetchCapability[] {
    return this.scope.grants.filter(
      (capability) => capability.kind === 'fetch',
    );
  }
}

/*
 * Only a raw address, `localhost` or `*.localhost`, declared with a reason, may reach a loopback or
 * private address. A named host never does, so its DNS answer can't rebind it onto this Mac.
 */
const exactHost = ({ host, reason }: FetchCapability): HostRule => ({
  private: Boolean(reason) && isSpecialHost(host),
});

function anyHost(capabilities: FetchCapability[], url: URL): HostRule {
  if (capabilities.some(({ host }) => host === '*')) return { private: false };

  throw new CapabilityRefusal(`${url.host} is not a declared host`);
}
