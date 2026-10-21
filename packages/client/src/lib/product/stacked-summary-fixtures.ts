import type {
  StackedSummaryIcon,
  StackedSummaryProps,
} from './stacked-summary';

// Two Subagents that finished, each with its own role mark: the Workbench's Agents card.
const subagentIcons: StackedSummaryIcon[] = [
  { icon: 'plan-mode', tone: 'done' },
  { icon: 'flask', tone: 'success' },
];

// Five Changes, two of them merged: the Workbench's Changes card, whose repeated mark collapses.
const changeIcons: StackedSummaryIcon[] = [
  { icon: 'pr-merged', tone: 'done' },
  { icon: 'pr-merged', tone: 'done' },
  { icon: 'pr-closed', tone: 'danger' },
  { icon: 'pr-open', tone: 'success' },
  { icon: 'branch', tone: 'neutral' },
];

// Three Shells, which draw the same mark: the Workbench's Shells card.
const shellIcons: StackedSummaryIcon[] = [
  { icon: 'terminal', tone: 'neutral' },
  { icon: 'terminal', tone: 'neutral' },
  { icon: 'terminal', tone: 'neutral' },
];

export const distinctMarks = {
  icons: subagentIcons,
  texts: ['2 done'],
} satisfies StackedSummaryProps;

export const repeatedMarks = {
  icons: changeIcons,
  texts: ['2 merged', '1 closed', '1 open', '1 branch'],
} satisfies StackedSummaryProps;

export const singleMark = {
  icons: shellIcons,
  texts: ['3 shells'],
} satisfies StackedSummaryProps;
