import { useState, type ReactElement } from 'react';
import {
  WorkbenchCollapsibleTitle,
  type WorkbenchCollapsibleTitleProps,
} from './workbench-collapsible-title';

function useInteractiveTitle(
  props: WorkbenchCollapsibleTitleProps,
): WorkbenchCollapsibleTitleProps {
  const [expanded, setExpanded] = useState(props.expanded);

  return {
    ...props,
    expanded,
    onPress: (): void => {
      props.onPress();
      setExpanded((value) => !value);
    },
  };
}

export function InteractiveWorkbenchTitle(
  props: WorkbenchCollapsibleTitleProps,
): ReactElement {
  return <WorkbenchCollapsibleTitle {...useInteractiveTitle(props)} />;
}
