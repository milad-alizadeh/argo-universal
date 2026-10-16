import type { ReactElement } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import type { ElicitationModel } from '../../hooks/use-elicitation-form';
import { ElicitationFields, ElicitationHeading } from './elicitation-form-body';

// The sheet scrolls these fields itself; iOS's grouped Form scrolls its own.
export const sheetFieldsScroll = false;

// Android and a narrow web window stack the fields, Android's as bare Material fields.
export function ElicitationSheetFields({
  model,
}: {
  model: ElicitationModel;
}): ReactElement {
  return (
    <View className={fieldsClassName(model)}>
      <ElicitationHeading
        source={model.props.source}
        message={model.props.request.message}
      />
      <ElicitationFields model={model} />
    </View>
  );
}

const fieldsClassName = (model: ElicitationModel): string =>
  cn(
    'gap-4 px-4 pt-4 pb-2',
    model.inactive ? 'pointer-events-none' : 'pointer-events-auto',
    model.state.kind === 'answered' && 'opacity-50',
  );
