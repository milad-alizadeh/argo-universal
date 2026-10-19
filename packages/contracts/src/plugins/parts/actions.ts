import { iconButtonPart } from '../icon-button-part';
import { part } from '../plugin-part-schema-utils';
import { selectionPartSchemas } from '../selection-parts';
import { buttonGroupProps } from '../simple-kit-props';
import { wireParts } from '../wire-parts';

export const actionsPartSchemas = {
  Button: wireParts.Button,
  IconButton: iconButtonPart,
  ButtonGroup: part('A joined group of buttons.', buttonGroupProps, {
    children: true,
    slots: {},
  }),
  SplitButton: selectionPartSchemas.SplitButton,
  ActionList: wireParts.ActionList,
  'ActionList.Section': wireParts['ActionList.Section'],
  Action: wireParts.Action,
};
