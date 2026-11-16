// One pull request as GitHub's REST API answers it, with the fields the Plugin reads.
export type FixturePull = {
  number: number;
  title: string;
  state: 'open' | 'closed';
  merged: boolean;
  draft: boolean;
  mergeable_state: string;
  // GraphQL's id of the pull request, and its auto-merge when GitHub has it turned on.
  node_id: string;
  auto_merge: { merge_method: string } | null;
  html_url: string;
  // Numbers; a test may send anything else to see it refused.
  additions: number | string;
  deletions: number;
  changed_files: number;
  head: { ref: string; sha: string; repo: { full_name: string } };
  base: { ref: string; repo: { full_name: string } };
  // The account that opened it.
  user: { login: string };
};

// One changed file as GitHub lists a pull request's files; `patch` is absent for a binary or very large file.
export type FixtureFile = {
  filename: string;
  // GitHub's statuses are added, removed, modified, renamed, copied, changed and unchanged; a test may send any other.
  status: string;
  // A number; a test may send anything else to see it refused.
  additions: number | string;
  deletions: number | string;
  patch?: string;
  previous_filename?: string;
};

// One Check run of a commit as GitHub's REST API answers it.
export type FixtureCheck = {
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion:
    | 'success'
    | 'failure'
    | 'neutral'
    | 'skipped'
    | 'cancelled'
    | null;
};

// One review comment on a pull request's diff as GitHub's REST API answers it; `line` is null once the line is outdated.
export type FixtureComment = {
  id: number;
  path: string;
  line: number | null;
  body: string;
  // `type` is `Bot` for a GitHub App.
  user: { login: string; type: string };
  // How the author is related to the repository: OWNER, MEMBER, COLLABORATOR, CONTRIBUTOR, NONE and so on.
  author_association: string;
};
