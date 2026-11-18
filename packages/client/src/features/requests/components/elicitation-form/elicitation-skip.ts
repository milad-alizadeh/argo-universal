import type { ElicitationModel } from '../../hooks/use-elicitation-form';

type Entries = ElicitationModel['schema']['fields'];

type SkipPage = {
  model: Pick<
    ElicitationModel,
    'form' | 'schema' | 'props' | 'inactive' | 'answer'
  >;
  page: Entries;
  pages: Entries[];
  count: number;
  index: number;
  last: boolean;
  navigate: (index: number) => void;
};

export function skipFieldPage(flow: SkipPage): void {
  if (flow.model.inactive) return;

  if (flow.count === 1) return flow.model.answer('decline');

  clearPage(flow.model.form, flow.page);

  finishSkip(flow);
}

function finishSkip(flow: SkipPage): void {
  if (flow.last) submitSkipped(flow);
  else flow.navigate(flow.index + 1);
}

function submitSkipped(flow: SkipPage): void {
  const value = flow.model.form.state.values;
  const errors = flow.model.schema.validate({ value });

  const invalid = flow.pages.findIndex((page) =>
    page.some((entry) => errors?.fields[entry.key]),
  );

  if (invalid >= 0) return flow.navigate(invalid);

  if (flow.model.schema.error) return;

  flow.model.props.onAnswer({
    action: 'accept',
    content: flow.model.schema.content(value),
  });
}

function clearPage(form: ElicitationModel['form'], page: Entries): void {
  for (const entry of page) form.setFieldValue(entry.key, undefined);
}
