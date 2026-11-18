import type { ElicitationPagedModel } from '../../hooks/use-elicitation-field-pages';
import type { ElicitationView } from './elicitation-body';
import { QuestionPager } from './elicitation-question-pager';

export function fieldsHeader(
  model: Pick<
    ElicitationPagedModel,
    'count' | 'index' | 'last' | 'inactive' | 'navigate'
  > & { message: string },
): ElicitationView['header'] {
  if (model.count <= 1) return { title: model.message };

  return {
    title: model.message,
    progress: `${model.index + 1} of ${model.count}`,
    pager: <QuestionPager model={model} />,
  };
}
