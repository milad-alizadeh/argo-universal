import { drawsNothing, markupInput, renderMarkup } from './diagram-drawing';
import {
  type MarkupInput,
  colourStatement,
  diagramMarkup,
  lineMarkup,
} from './diagram-markup';
import {
  type DiagramKeyword,
  type SourceLine,
  readDiagramSource,
  supportedDiagramKeywords,
} from './diagram-source';

export interface DiagramProblem {
  // The fence's own line, counted from 1, when the problem is on one line.
  line?: number;
  message: string;
}

export type DiagramCheck =
  | { valid: true }
  | {
      valid: false;
      problems: DiagramProblem[];
      supported: DiagramKeyword[];
    };

// Lines that open, close or label a block draw nothing on their own, so they are not checked alone.
const structural: Partial<Record<DiagramKeyword, RegExp>> = {
  flowchart: /^\s*(?:subgraph|end|direction|class|click)\b/,
  graph: /^\s*(?:subgraph|end|direction|class|click)\b/,
  stateDiagram: /^\s*(?:state|note|end|direction|class|\}|--)/,
  'stateDiagram-v2': /^\s*(?:state|note|end|direction|class|\}|--)/,
  sequenceDiagram:
    /^\s*(?:loop|alt|else|opt|par|and|critical|break|rect|end|box|autonumber|activate|deactivate|title)\b/,
};

const unreadMessage =
  'Argo cannot read this line, so the diagram would leave it out.';

function unreadLines(input: MarkupInput): DiagramProblem[] {
  const skip = structural[input.keyword];

  if (!skip) return [];

  return input.body
    .filter((line) => !skip.test(line.text) && !colourStatement.test(line.text))
    .filter((line) => drawsAlone(input, line))
    .map((line) => ({ line: line.number, message: unreadMessage }));
}

const drawsAlone = (input: MarkupInput, line: SourceLine): boolean =>
  drawsNothing(input, renderMarkup(lineMarkup(input, line)));

function headerProblem(source: string): DiagramProblem {
  const { header, keyword } = readDiagramSource(source);

  if (!header)
    return {
      message: 'The fence has no diagram header, such as `flowchart TD`.',
    };

  return {
    line: header.number,
    message: `Argo cannot draw \`${keyword ?? ''}\` diagrams.`,
  };
}

function drawnProblems(input: MarkupInput): DiagramProblem[] {
  if (!drawsNothing(input, renderMarkup(diagramMarkup(input)))) {
    return unreadLines(input);
  }

  return [{ line: input.header.number, message: 'The diagram draws nothing.' }];
}

function renderProblems(input: MarkupInput): DiagramProblem[] {
  try {
    return drawnProblems(input);
  } catch (error) {
    return [
      { message: error instanceof Error ? error.message : String(error) },
    ];
  }
}

const failed = (problems: DiagramProblem[]): DiagramCheck => ({
  valid: false,
  problems,
  supported: [...supportedDiagramKeywords],
});

// Whether Argo draws the fence, and if not, what to fix: the same renderer the Apps draw with.
export function checkDiagram(source: string): DiagramCheck {
  const input = markupInput(source);
  const problems = input ? renderProblems(input) : [headerProblem(source)];

  return problems.length === 0 ? { valid: true } : failed(problems);
}
