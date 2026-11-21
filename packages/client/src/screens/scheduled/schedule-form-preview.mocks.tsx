import { useState, type ReactElement } from 'react';
import type { ScheduleCadenceDraft } from './schedule-cadence-draft';
import {
  ScheduleFormView,
  type ScheduleFormViewProps,
} from './schedule-form-view';

type PreviewProps = ScheduleFormViewProps & {
  preview?: (draft: ScheduleCadenceDraft) => string | undefined;
};

export function ScheduleFormPreview({
  preview,
  ...props
}: PreviewProps): ReactElement {
  const [draft, setDraft] = useState(props.timing.draft);

  const onChange = (next: ScheduleCadenceDraft): void => {
    setDraft(next);
    props.timing.onChange(next);
  };

  return (
    <ScheduleFormView
      {...props}
      timing={{
        ...props.timing,
        draft,
        onChange,
        nextRun: preview ? preview(draft) : props.timing.nextRun,
      }}
    />
  );
}
