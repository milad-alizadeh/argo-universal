import type {
  RunGroupStartResult,
  RunGroupStopResult,
  RunStartResult,
  RunStopResult,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type {
  RunConfiguration,
  RunConfigurations,
  RunGroup,
} from './run-configurations';
import { readRunFile, requireConfiguration } from './run-file';
import type { RunCheckout, RunRequest } from './runs';

type GroupPorts = {
  start: (
    checkout: RunRequest,
    configuration: RunConfiguration,
    timeoutMs?: number,
  ) => Promise<RunStartResult>;
  stop: (checkout: RunCheckout, name: string) => Promise<RunStopResult>;
};

const groupIn = (file: RunConfigurations, name: string): RunGroup => {
  if (Object.hasOwn(file.groups, name)) {
    const group = file.groups[name];

    if (group) return group;
  }

  throw new TRPCError({
    code: 'NOT_FOUND',
    message: `No Run Configuration group named "${name}" in .argo/run.json.`,
  });
};

export const distinctMembers = ({ members }: RunGroup): string[] => [
  ...new Set(members),
];

const companionsOf = (file: RunConfigurations, name: string): string[] => [
  ...new Set(
    Object.values(file.groups)
      .filter(
        ({ members, stopAll }) => stopAll === true && members.includes(name),
      )
      .flatMap(({ members }) => members)
      .filter((member) => member !== name),
  ),
];

export class RunGroups {
  public constructor(private readonly ports: GroupPorts) {}

  public async start(
    checkout: RunRequest,
    name: string,
    timeoutMs?: number,
  ): Promise<RunGroupStartResult> {
    const file = await readRunFile(checkout.checkoutPath);
    const group = groupIn(file, name);

    const members = distinctMembers(group).map((member) =>
      requireConfiguration(file, member),
    );

    return {
      name,
      members: await Promise.all(
        members.map((configuration) =>
          this.startMember(checkout, configuration, timeoutMs),
        ),
      ),
    };
  }

  public async stop(
    checkout: RunCheckout,
    name: string,
  ): Promise<RunGroupStopResult> {
    const file = await readRunFile(checkout.checkoutPath);
    const group = groupIn(file, name);

    return {
      name,
      members: await Promise.all(
        distinctMembers(group).map((member) =>
          this.ports.stop(checkout, member),
        ),
      ),
    };
  }

  public async stopMember(
    checkout: RunCheckout,
    name: string,
  ): Promise<RunStopResult> {
    const file = await readRunFile(checkout.checkoutPath);
    requireConfiguration(file, name);

    const [selected] = await Promise.all([
      this.ports.stop(checkout, name),
      ...companionsOf(file, name).map((member) =>
        this.ports.stop(checkout, member),
      ),
    ]);

    return selected;
  }

  private async startMember(
    checkout: RunRequest,
    configuration: RunConfiguration,
    timeoutMs?: number,
  ): Promise<RunGroupStartResult['members'][number]> {
    try {
      return await this.ports.start(checkout, configuration, timeoutMs);
    } catch (error) {
      return {
        name: configuration.name,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
