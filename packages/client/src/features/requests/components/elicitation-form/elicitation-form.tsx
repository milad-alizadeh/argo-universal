import type { ComponentProps, ReactElement } from 'react';
import { View } from 'react-native';
import {
  useElicitationForm,
  type ElicitationModel,
} from '../../hooks/use-elicitation-form';
import { RequestCard } from '../request-card/request-card';
import { ElicitationActions } from './elicitation-actions';
import {
  ElicitationFields,
  ElicitationHeading,
  ElicitationValidation,
} from './elicitation-form-body';
import type { ElicitationFormProps } from './elicitation-form-props';

export type { ElicitationValues } from './elicitation-schema';
export type {
  ElicitationAnswer,
  ElicitationFormProps,
} from './elicitation-form-props';

export function ElicitationForm(props: ElicitationFormProps): ReactElement {
  return <RequestForm key={props.request.requestId} {...props} />;
}

function RequestForm(props: ElicitationFormProps): ReactElement {
  const model = useElicitationForm(props);
  return (
    <RequestCard {...cardProps(model)}>
      <FormBody model={model} />
    </RequestCard>
  );
}

function cardProps(
  model: ElicitationModel,
): Omit<ComponentProps<typeof RequestCard>, 'children'> {
  return {
    state: model.state,
    error: model.error,
    onEnter: (): void => model.answer('accept'),
    className:
      'rounded-none bg-transparent native:bg-transparent shadow-none web:backdrop-blur-none',
    footerClassName: 'flex-col items-stretch gap-2 px-4 pb-4',
    actions: <ElicitationActions model={model} />,
  };
}

function FormBody({ model }: { model: ElicitationModel }): ReactElement {
  return (
    <>
      <View
        pointerEvents={model.inactive ? 'none' : 'auto'}
        className="gap-4 px-4 pt-4"
      >
        <ElicitationHeading
          source={model.props.source}
          message={model.props.request.message}
        />
        <ElicitationFields model={model} />
      </View>
      <ElicitationValidation
        answered={model.state.kind === 'answered'}
        labels={model.invalid}
      />
    </>
  );
}
