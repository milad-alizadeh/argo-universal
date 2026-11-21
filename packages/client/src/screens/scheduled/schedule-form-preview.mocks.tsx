import { useState, type ReactElement } from 'react';
import type { ScheduleCadenceDraft } from './schedule-cadence-draft';
import {
  ScheduleFormView,
  type ScheduleFormViewProps,
} from './schedule-form-view';

export function ScheduleFormPreview(
  props: ScheduleFormViewProps,
): ReactElement {
  const [draft, setDraft] = useState(props.timing.draft);

  const onChange = (next: ScheduleCadenceDraft): void => {
    setDraft(next);
    props.timing.onChange(next);
  };

  return (
    <ScheduleFormView
      {...props}
      timing={{ ...props.timing, draft, onChange }}
    />
  );
}
