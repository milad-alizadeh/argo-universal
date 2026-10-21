import type { ReactElement } from 'react';
import { Text } from '#primitives/content/text';
import { SizeClass } from '../../../lib/generic/size-class/size-class';
import { WindowBand } from '../../../lib/product/window-band';
import { SessionHeaderBar } from './session-header-bar';
import { SessionHeaderMenu } from './session-header-menu';
import type { SessionHeaderProps } from './session-header-props';
import { WorkbenchColumn } from './workbench-column';

export type {
  SessionHeaderProps,
  SessionHeaderStatus,
} from './session-header-props';

function HeaderTitle({
  title,
}: Pick<SessionHeaderProps, 'title'>): ReactElement {
  return (
    <Text
      role="heading"
      accessibilityRole="heading"
      aria-level={2}
      numberOfLines={1}
    >
      {title}
    </Text>
  );
}

function headerMenu({ menu }: SessionHeaderProps): ReactElement | undefined {
  return menu ? <SessionHeaderMenu menu={menu} reserved /> : undefined;
}

function headerWorkbench({
  panels,
}: SessionHeaderProps): ReactElement | undefined {
  return panels ? <WorkbenchColumn panels={panels} /> : undefined;
}

function stageToggle({ panels }: SessionHeaderProps): (() => void) | undefined {
  if (!panels) return undefined;

  return () => (panels.onSelect ?? panels.onToggle)('changes');
}

// In a framed Session, the window owns the title, menu and overview; the Feed has no local header.
function WideSessionHeader(props: SessionHeaderProps): ReactElement {
  const title = <HeaderTitle title={props.title} />;
  const menu = headerMenu(props);

  return (
    <WindowBand
      title={title}
      menu={menu}
      workbench={headerWorkbench(props)}
      onStageToggle={stageToggle(props)}
    >
      <SessionHeaderBar title={title} actions={menu} />
    </WindowBand>
  );
}

export function SessionHeader(props: SessionHeaderProps): ReactElement {
  return (
    <SizeClass only="wide">
      <WideSessionHeader {...props} />
    </SizeClass>
  );
}
