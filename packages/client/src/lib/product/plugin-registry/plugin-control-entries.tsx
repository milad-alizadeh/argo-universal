import { wireParts } from '@repo/contracts/plugins/kit';
import {
  PluginButton,
  PluginIconButton,
  PluginSplitButton,
} from './plugin-buttons';
import {
  PluginPicker,
  PluginSlider,
  PluginTextInput,
  PluginBinaryControl,
} from './plugin-inputs';
import { entry } from './plugin-rendering';

export const pluginControlEntries = {
  Picker: entry(wireParts.Picker.props, (props, context) => (
    <PluginPicker props={props} context={context} />
  )),
  Slider: entry(wireParts.Slider.props, (props, context) => (
    <PluginSlider props={props} context={context} />
  )),
  TextInput: entry(wireParts.TextInput.props, (props, context) => (
    <PluginTextInput props={props} context={context} />
  )),
  IconButton: entry(wireParts.IconButton.props, (props, context) => (
    <PluginIconButton props={props} context={context} />
  )),
  SplitButton: entry(wireParts.SplitButton.props, (props, context) => (
    <PluginSplitButton props={props} context={context} />
  )),
  Switch: entry(wireParts.Switch.props, (props, context) => (
    <PluginBinaryControl type="Switch" props={props} context={context} />
  )),
  Checkbox: entry(wireParts.Checkbox.props, (props, context) => (
    <PluginBinaryControl type="Checkbox" props={props} context={context} />
  )),
  Button: entry(wireParts.Button.props, (props, context) => (
    <PluginButton props={props} context={context} />
  )),
};
