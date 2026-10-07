// What tools/check-comments.mts reports on one line of source.
interface CommentRule {
  pattern: RegExp;
  message: string;
}

const SUPPRESSION =
  /\b(?:oxlint|eslint)-disable(?:-next-line|-line)?(?![\w-])(.*)$/;
const RULE_NAME = String.raw`[@\w][\w@/-]*`;

const textRules: CommentRule[] = [
  {
    pattern: /\b(?:TODO|FIXME|XXX|HACK)\b/,
    message: 'Open a GitHub issue for the work instead of a marker.',
  },
  { pattern: /@ts-nocheck/, message: 'Fix the types; every file is checked.' },
  {
    pattern: /@ts-expect-error\s*(?:--\s*)?(?:\*\/\s*)?$/,
    message: 'Say why the error is expected.',
  },
  {
    pattern: /jscpd:ignore-start\s*(?:\*\/\s*)?$/,
    message: 'Say why the clone stays.',
  },
];

// Each rule reads the rule list of a suppression, the text before its `--` reason.
const suppressionRules: CommentRule[] = [
  {
    pattern: new RegExp(`^(?!\\s+${RULE_NAME}(?:\\s*,\\s*${RULE_NAME})*\\s*$)`),
    message:
      'Name the exact rule: oxlint-disable-next-line <plugin>/<rule> -- reason.',
  },
  {
    pattern:
      /(?:^|[\s,/])(?:max-lines-per-function|max-lines|complexity|max-depth|max-nested-callbacks|max-statements|max-params|cognitive-complexity)(?![\w-])/,
    message:
      'Refactor to meet the cap; S2 refuses per-occurrence disables (docs/agents/prickles/prickles-style.md, ADR-0016).',
  },
  {
    pattern: /(?:^|[\s,])argo\//,
    message:
      "Exempt the folder in the argo rule's override in tooling/oxlint/argo.json instead.",
  },
];

// The text after a comment opener on this line, or undefined when the line has none.
const commentText = (line: string): string | undefined => {
  const opener = line.search(/\/\/|\/\*/);
  if (opener !== -1) return line.slice(opener + 2);
  const trimmed = line.trimStart();
  return trimmed.startsWith('*') ? trimmed.slice(1) : undefined;
};

const messages = (rules: CommentRule[], text: string): string[] =>
  rules
    .filter(({ pattern }) => pattern.test(text))
    .map(({ message }) => message);

const ruleList = (suppression: string): string =>
  suppression.split('*/', 1).join('').split('--', 1).join('');

const suppressionProblems = (text: string): string[] => {
  const match = SUPPRESSION.exec(text);
  return match ? messages(suppressionRules, ruleList(match[1] ?? '')) : [];
};

export const commentProblems = (line: string): string[] => {
  const text = commentText(line);
  if (text === undefined) return [];
  return [...messages(textRules, text), ...suppressionProblems(text)];
};
