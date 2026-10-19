// What the Server answers `argo` calls with, where no contract schema names the answer.

export type ProcessResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  truncated: boolean;
  timedOut: boolean;
};

export type PluginFileKind = 'directory' | 'file';

export type PluginFileEntry = { name: string; kind: PluginFileKind };

export type PluginFileInfo = {
  kind: PluginFileKind;
  size: number;
  modified: number;
};

// The body as the Server read it, capped at its limit.
export type PluginFetchReply = {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  truncated: boolean;
};
