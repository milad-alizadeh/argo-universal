import type { ElicitationPagedModel } from '../../hooks/use-elicitation-field-pages';
import type { ElicitationView } from './elicitation-body';
import { QuestionPager } from './elicitation-question-pager';

export function fieldsHeader(
  model: ElicitationPagedModel,
): ElicitationView['header'] {
  if (model.count <= 1) return { title: model.props.request.message };

  return {
    title: model.props.request.message,
    progress: `${model.index + 1} of ${model.count}`,
    pager: <QuestionPager model={model} />,
  };
}
