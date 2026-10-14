const redacted = '[redacted]';

const maxLength = 300;

const secretName =
  '[A-Za-z0-9_.-]*(?:token|secret|password|passwd|api[_-]?key|access[_-]?key|credential|session[_-]?key|cookie)[A-Za-z0-9_.-]*';

const replacements: readonly [RegExp, string][] = [
  // eslint-disable-next-line no-control-regex -- terminal colour codes are what this removes
  [/\u001b\[[0-9;?]*[ -/]*[@-~]/g, ''],
  [/\b(authorization|proxy-authorization)\s*:\s*[^\n,;]+/gi, `$1: ${redacted}`],
  [/\bbearer\s+[\w.~+/=-]+/gi, redacted],
  [/(\b[a-z][a-z0-9+.-]*:\/\/)[^/\s:@]+:[^/\s@]+@/gi, `$1${redacted}@`],
  [
    new RegExp(
      `(["']?${secretName}["']?\\s*[:=]\\s*)("[^"]*"|'[^']*'|[^\\s&,;]+)`,
      'gi',
    ),
    `$1${redacted}`,
  ],
  [/\bsk-[\w-]{8,}/g, redacted],
  [/\b(?:gh[pousr]_|github_pat_)\w{20,}/g, redacted],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/g, redacted],
  [/\bAKIA[0-9A-Z]{16}\b/g, redacted],
  [/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, redacted],
  // eslint-disable-next-line no-control-regex -- control characters never reach the App
  [/[\u0000-\u001f\u007f]+/g, ' '],
  [/\s+/g, ' '],
];

// A reason the App can show: one line, bounded, with no credential in it.
export const sanitizeReason = (reason: string): string => {
  const cleaned = replacements
    .reduce((text, [pattern, value]) => text.replace(pattern, value), reason)
    .trim();

  return cleaned.length > maxLength
    ? `${cleaned.slice(0, maxLength - 1)}…`
    : cleaned;
};
