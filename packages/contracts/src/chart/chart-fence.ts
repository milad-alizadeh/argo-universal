import { chartProps } from '../plugins/visual-props';

const chartData = chartProps.omit({ onPress: true });

const openingFence = /^ {0,3}(`{3,}|~{3,})[ \t]*chart[ \t]*(?![\s\S])/iu;

const closingFence = /^ {0,3}(`{3,}|~{3,})[ \t]*(?![\s\S])/u;

interface ChartFenceProblem {
  path: (string | number)[];
  message: string;
}

type ChartFenceResult =
  | { valid: true; data: ReturnType<typeof chartData.parse> }
  | { valid: false; problems: ChartFenceProblem[] };

function closes(opening: string, lastLine: string): boolean {
  return closingFence.exec(lastLine)?.[1]?.startsWith(opening) ?? false;
}

function problem(message: string): ChartFenceResult {
  return { valid: false, problems: [{ path: [], message }] };
}

function validateJson(source: string): ChartFenceResult {
  let json: unknown;

  try {
    json = JSON.parse(source);
  } catch {
    return problem('The Chart body must be valid JSON.');
  }

  const result = chartData.safeParse(json);

  if (result.success) return { valid: true, data: result.data };

  return {
    valid: false,
    problems: result.error.issues.flatMap((issue) => {
      const path = issue.path.map((part) =>
        typeof part === 'number' ? part : String(part),
      );

      return issue.code === 'unrecognized_keys'
        ? issue.keys.map((key) => ({
            path: [...path, key],
            message: 'This field is not supported.',
          }))
        : [{ path, message: issue.message }];
    }),
  };
}

// Both the Feed token and the preview Operation supply the full fence, including its markers.
export function validateChartFence(fence: string): ChartFenceResult {
  const lines = fence.split(/\r\n|[\r\n]/u);

  while (lines.length > 1 && !/[^ \t]/u.test(lines.at(-1) ?? '')) lines.pop();

  const marker = openingFence.exec(lines[0] ?? '')?.[1];

  if (!marker || lines.length < 2 || !closes(marker, lines.at(-1) ?? ''))
    return problem(
      'Supply one complete chart fence with opening and closing markers.',
    );

  return validateJson(lines.slice(1, -1).join('\n'));
}
