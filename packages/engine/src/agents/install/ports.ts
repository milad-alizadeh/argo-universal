export type InstallToolInput = {
  executable: string;
  args: readonly string[];
  cwd: string;
  env?: Record<string, string>;
  signal: AbortSignal;
  outputFile?: string;
  outputLimit?: number;
  // What the tool installs, for its failure: the Agent unless it names a tool such as Node.js.
  subject?: string;
};

export type InstallPorts = {
  runTool: (input: InstallToolInput) => Promise<string>;
  download: (url: string, signal: AbortSignal) => Promise<Uint8Array>;
};
