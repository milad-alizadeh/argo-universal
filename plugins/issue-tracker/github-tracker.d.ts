export type GitHubIssue = {
  number: number;
  title: string;
  status: 'open' | 'closed';
  body: string;
  url: string;
  labels: string[];
  assignees: string[];
};

export type GitHubTracker = {
  authStatus(): Promise<string>;
  listIssues(input: { repository: string }): Promise<GitHubIssue[]>;
  getIssue(input: { repository: string; number: number }): Promise<GitHubIssue>;
  setStatus(input: {
    repository: string;
    number: number;
    status: GitHubIssue['status'];
  }): Promise<void>;
};

export function createGitHubTracker(argo: {
  process: {
    run(argv: string[]): Promise<{
      exitCode: number | null;
      stdout: string;
      stderr: string;
      truncated: boolean;
      timedOut: boolean;
    }>;
  };
}): GitHubTracker;
