import type { ReactElement } from 'react';
import { ContentWidthProvider } from '#lib/product/content-layout';
import type { ElicitationModel } from '../../hooks/use-elicitation-form';
import { RequestError } from '../request-card/request-card';
import { RequestFooter } from '../request-card/request-footer';
import { ElicitationActions } from './elicitation-actions';
import { ElicitationValidation } from './elicitation-form-body';

/*
 * Under the fields, in view at any height the sheet rests at: what stops the answer, then the
 * actions stacked at full width, as the Permission sheet's are.
 */
export function ElicitationSheetFooter({
  model,
}: {
  model: ElicitationModel;
}): ReactElement {
  return (
    <ContentWidthProvider wide={false}>
      <SheetMessages model={model} />
      <SheetActions model={model} />
    </ContentWidthProvider>
  );
}

function SheetMessages({ model }: { model: ElicitationModel }): ReactElement {
  return (
    <>
      <ElicitationValidation
        answered={model.state.kind === 'answered'}
        labels={model.invalid}
      />
      <RequestError error={model.error} />
    </>
  );
}

function SheetActions({ model }: { model: ElicitationModel }): ReactElement {
  const actions = <ElicitationActions model={model} />;

  return <RequestFooter surface="tray" state={model.state} actions={actions} />;
}
