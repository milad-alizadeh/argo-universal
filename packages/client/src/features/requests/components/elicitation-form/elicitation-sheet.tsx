import type { ReactElement } from 'react';
import { useContentWide } from '#lib/product/content-layout';
import { ElicitationContent } from './elicitation-form';
import type { ElicitationFormProps } from './elicitation-form-props';

// The request over a Session: the wide Composer's tray, or a sheet on a phone or a narrow window.
export function ElicitationSheet(props: ElicitationFormProps): ReactElement {
  return (
    <ElicitationContent
      key={props.request.requestId}
      {...props}
      placement={useContentWide() ? 'tray' : 'sheet'}
    />
  );
}
