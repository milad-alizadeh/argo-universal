import { $createTextNode, type TextNode } from 'lexical';
import { Listeners } from '../rich-textarea-listeners';
import { suggestionRow } from '../rich-textarea-suggestion-row';
import { SuggestionRun } from '../rich-textarea-suggestion-run';
import {
  findCommand,
  type ComposerSuggestion,
  type SuggestionGroup,
  type SuggestionSource,
} from '../rich-textarea-suggestions';
import { $insertCommand } from './rich-textarea-command-tokens';
import { suggestionTrigger } from './rich-textarea-suggestion-trigger';
import {
  TypeaheadOption,
  type TypeaheadAdapter,
} from './rich-textarea-typeahead-option';

function $insertText(node: TextNode, text: string): void {
  const inserted = $createTextNode(text);
  node.replace(inserted);
  inserted.selectEnd();
}

// A result is a command token only when its source lists the command, as a typed `/name` must be.
function listedCommand(
  sources: readonly SuggestionSource[],
  command: string | undefined,
): string | undefined {
  return command !== undefined && findCommand(sources, command)
    ? command
    : undefined;
}

function insertSuggestion(
  node: TextNode | null,
  sources: readonly SuggestionSource[],
  suggestion: ComposerSuggestion,
): void {
  if (!node) return;
  const { insert, command } = suggestion;
  const name = listedCommand(sources, command);

  if (name) $insertCommand(node, name);
  else $insertText(node, insert);
}

type Choose = (suggestion: ComposerSuggestion) => void;

// What choosing a result needs: the sources, to know its commands, and whom to tell.
interface Menu {
  sources: readonly SuggestionSource[];
  choose: Choose | undefined;
}

function suggestionOption(
  menu: Menu,
  source: SuggestionSource,
  suggestion: ComposerSuggestion,
): TypeaheadOption {
  return new TypeaheadOption(suggestionRow(source, suggestion), (node) => {
    insertSuggestion(node, menu.sources, suggestion);
    menu.choose?.(suggestion);
  });
}

const groupOptions =
  (menu: Menu) =>
  ({ source, suggestions }: SuggestionGroup): TypeaheadOption[] =>
    suggestions.map((suggestion) => suggestionOption(menu, source, suggestion));

interface Latest {
  query: string;
  run: SuggestionRun;
  stop: () => void;
}

/*
 * `ask` queries the sources once for a query and keeps the run; `recall` reuses it while the query is
 * the same. Asking again drops the previous run, so a late answer to an earlier query is never heard.
 */
class SuggestionAnswers {
  private latest: Latest | null = null;
  private readonly listeners = new Listeners();

  constructor(private readonly sources: readonly SuggestionSource[]) {}

  subscribe = this.listeners.add;

  forget = (): void => {
    this.latest?.stop();
    this.latest = null;
  };

  ask = (query: string): SuggestionRun => {
    if (this.latest?.query === query) return this.latest.run;
    this.forget();
    const run = new SuggestionRun(this.sources, query);
    this.latest = { query, run, stop: run.subscribe(this.listeners.notify) };

    return run;
  };

  recall = (query: string): SuggestionRun =>
    this.latest?.query === query ? this.latest.run : this.ask(query);
}

// The trigger asks the sources once per change and the options recall that answer.
export function suggestionAdapter(
  sources: readonly SuggestionSource[],
  choose?: Choose,
): TypeaheadAdapter {
  const answers = new SuggestionAnswers(sources);
  const menu = { sources, choose };

  return {
    trigger: suggestionTrigger(answers.ask, answers.forget),
    options: (query) =>
      answers.recall(query).groups().flatMap(groupOptions(menu)),
    pending: (query) => answers.recall(query).pending(),
    subscribe: answers.subscribe,
  };
}
