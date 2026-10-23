import { iconButtonPart } from '../icon-button-part';
import { selectionPartSchemas } from '../selection-parts';
import { wireParts } from '../wire-parts';

export const actionsPartSchemas = {
  Button: wireParts.Button,
  IconButton: iconButtonPart,
  SplitButton: selectionPartSchemas.SplitButton,
  ActionList: wireParts.ActionList,
  'ActionList.Section': wireParts['ActionList.Section'],
  Action: wireParts.Action,
};
