export type InstallToolInput = {
  executable: string;
  args: readonly string[];
  cwd: string;
  env?: Record<string, string>;
  signal: AbortSignal;
  outputFile?: string;
  outputLimit?: number;
};

export type InstallPorts = {
  runTool: (input: InstallToolInput) => Promise<string>;
  download: (
    url: string,
    signal: AbortSignal,
    progress?: (fraction: number) => void,
  ) => Promise<Uint8Array>;
};
