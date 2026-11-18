import { useStore } from '@tanstack/react-form';
import { useState } from 'react';
import type { ElicitationFormProps } from '../components/elicitation-form/elicitation-form-props';
import {
  questionPageIndex,
  questionPosition,
} from '../components/elicitation-form/elicitation-page-position';
import { elicitationPages } from '../components/elicitation-form/elicitation-pages';
import { skipFieldPage } from '../components/elicitation-form/elicitation-skip';
import {
  useElicitationForm,
  type ElicitationModel,
} from './use-elicitation-form';

type Entries = ElicitationModel['schema']['fields'];

type Errors = ReturnType<ElicitationModel['schema']['validate']>;

type Position = { index: number; count: number; last: boolean; page: Entries };

type PageState = Position & { canAdvance: boolean; errors: Errors };

type Navigation = { navigate: (index: number) => void };

type Flow = PageState &
  Navigation & { model: ElicitationModel; pages: Entries[] };

export type ElicitationPagedModel = ElicitationModel &
  Omit<PageState, 'errors'> &
  Navigation & {
    advance: () => void;
    skip: () => void;
  };

export function useElicitationFieldPages(
  props: ElicitationFormProps,
): ElicitationPagedModel {
  const model = useElicitationForm(props);
  const [index, setIndex] = useState(0);
  const pages = elicitationPages(model.schema.fields);
  const state = usePageState(model, pages, index);

  const navigate = (next: number): void => {
    if (!model.inactive) setIndex(questionPageIndex(next, pages.length));
  };

  return pagedModel({ model, ...state, pages, navigate });
}

function usePageState(
  model: Pick<ElicitationModel, 'form' | 'schema'>,
  pages: Entries[],
  index: number,
): PageState {
  const values = useStore(model.form.store, (state) => state.values);
  const errors = model.schema.validate({ value: values });
  const position = pagePosition(pages, index);

  return {
    ...position,
    errors,
    canAdvance: !model.schema.error && pageAllowed(position, errors),
  };
}

function pagePosition(pages: Entries[], index: number): Position {
  return {
    ...questionPosition(index, pages.length),
    page: pages[index] ?? [],
  };
}

function pageAllowed(position: Position, errors: Errors): boolean {
  const formError = position.last ? formIssue(errors) : undefined;

  return !formError && validPage(position.page, errors);
}

const validPage = (page: Entries, errors: Errors): boolean =>
  page.every((entry) => !errors?.fields[entry.key]);

function pagedModel(flow: Flow): ElicitationPagedModel {
  return {
    ...flow.model,
    ...pagePosition(flow.pages, flow.index),
    canAdvance: flow.canAdvance,
    navigate: flow.navigate,
    advance: (): void => advance(flow),
    skip: (): void => skipFieldPage(flow),
  };
}

function advance(flow: Flow): void {
  if (flow.model.inactive || !flow.canAdvance) return;

  finishPage(flow);
}

function finishPage(flow: Flow): void {
  if (flow.last) submit(flow);
  else flow.navigate(flow.index + 1);
}

function submit(flow: Flow): void {
  const invalid = flow.pages.findIndex((page) => !validPage(page, flow.errors));

  if (invalid >= 0) flow.navigate(invalid);
  else flow.model.answer('accept');
}

const formIssue = (errors: Errors): string | undefined => errors?.form;
