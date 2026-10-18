/* Generated from Contracts schema descriptions. Do not edit by hand. */
import type { z } from 'zod';
import type { pluginPartSchemas } from './plugin-part-schemas';

type PropValue<Name extends string, Prop extends PropertyKey> =
  Name extends keyof typeof pluginPartSchemas
    ? Prop extends keyof z.output<(typeof pluginPartSchemas)[Name]['props']>
      ? z.output<(typeof pluginPartSchemas)[Name]['props']>[Prop]
      : never
    : never;


export type WireSchemaHints = {
  "Stack": {
    /** A spacing token between children. */
    "gap": PropValue<"Stack", "gap">;
    /** Cross-axis alignment. */
    "align": PropValue<"Stack", "align">;
    /** The direction of the layout. */
    "direction": PropValue<"Stack", "direction">;
  };
  "Spacer": {
    /** Minimum token length. */
    "minLength": PropValue<"Spacer", "minLength">;
  };
  "Grid": {
    /** Column count, optionally by Size class. */
    "columns": PropValue<"Grid", "columns">;
    /** Spacing token between cells. */
    "gap": PropValue<"Grid", "gap">;
  };
  "Surface": {
    /** Surface treatment. */
    "kind": PropValue<"Surface", "kind">;
    /** Semantic fill role. */
    "fill": PropValue<"Surface", "fill">;
    /** Semantic shape token. */
    "radius": PropValue<"Surface", "radius">;
    /** Semantic depth token. */
    "depth": PropValue<"Surface", "depth">;
    /** on Press for this part. */
    "onPress": PropValue<"Surface", "onPress">;
    /** Actions available from this surface. */
    "actions": PropValue<"Surface", "actions">;
  };
  "Card": {
    /** on Press for this part. */
    "onPress": PropValue<"Card", "onPress">;
  };
  "ScrollView": {
    /** Scroll direction. */
    "axis": PropValue<"ScrollView", "axis">;
  };
  "Collapsible": {
    /** Controlled open state. */
    "open": PropValue<"Collapsible", "open">;
    /** Initial uncontrolled open state. */
    "defaultOpen": PropValue<"Collapsible", "defaultOpen">;
    /** Reports changes to the open state. */
    "onOpenChange": PropValue<"Collapsible", "onOpenChange">;
    /** Disable the disclosure trigger. */
    "disabled": PropValue<"Collapsible", "disabled">;
  };
  "Icon": {
    /** An Argo icon or an SF and Material symbol pair. */
    "name": PropValue<"Icon", "name">;
    /** Semantic icon size, optionally by Size class. */
    "role": PropValue<"Icon", "role">;
    /** Use the platform filled variant. */
    "filled": PropValue<"Icon", "filled">;
    /** Semantic symbol tone. */
    "tone": PropValue<"Icon", "tone">;
    /** Status mark over the symbol. */
    "status": PropValue<"Icon", "status">;
  };
  "Image": {
    /** source for this part. */
    "source": PropValue<"Image", "source">;
    /** Appearance-specific sources; `dark` is used in dark appearance and falls back to `light`. */
    "sources": PropValue<"Image", "sources">;
    /** Media aspect ratio. */
    "aspect": PropValue<"Image", "aspect">;
    /** Image fitting mode. */
    "fit": PropValue<"Image", "fit">;
    /** Semantic radius token. */
    "radius": PropValue<"Image", "radius">;
    /** accessibility Label for this part. */
    "accessibilityLabel": PropValue<"Image", "accessibilityLabel">;
  };
  "Video": {
    /** Video URL or Plugin asset routed through the Server. */
    "source": PropValue<"Video", "source">;
    /** The visible and accessible label. */
    "accessibilityLabel": PropValue<"Video", "accessibilityLabel">;
    /** Show native playback controls. */
    "controls": PropValue<"Video", "controls">;
  };
  "Audio": {
    /** Audio URL or Plugin asset routed through the Server. */
    "source": PropValue<"Audio", "source">;
    /** The visible and accessible label. */
    "accessibilityLabel": PropValue<"Audio", "accessibilityLabel">;
  };
  "Label": {
    /** An Argo icon name or an SF and Material symbol pair. */
    "icon": PropValue<"Label", "icon">;
    /** The text displayed by the part. */
    "text": PropValue<"Label", "text">;
    /** The Argo semantic tone. */
    "tone": PropValue<"Label", "tone">;
    /** Optional spoken description. */
    "accessibilityLabel": PropValue<"Label", "accessibilityLabel">;
  };
  "Kbd": {
    /** Keys in the shortcut. */
    "keys": PropValue<"Kbd", "keys">;
  };
  "Avatar": {
    /** Fallback initials. */
    "initials": PropValue<"Avatar", "initials">;
    /** Avatar size. */
    "size": PropValue<"Avatar", "size">;
    /** Image source supplied by the App. */
    "source": PropValue<"Avatar", "source">;
    /** Spoken identity. */
    "accessibilityLabel": PropValue<"Avatar", "accessibilityLabel">;
    /** Status mark over the avatar. */
    "status": PropValue<"Avatar", "status">;
  };
  "Markdown": {
    /** Markdown source text. */
    "source": PropValue<"Markdown", "source">;
  };
  "Code": {
    /** Code displayed in the block. */
    "code": PropValue<"Code", "code">;
    /** Optional language name. */
    "language": PropValue<"Code", "language">;
  };
  "Link": {
    /** The visible and accessible label. */
    "label": PropValue<"Link", "label">;
    /** URL or Argo route. */
    "href": PropValue<"Link", "href">;
    /** on Press for this part. */
    "onPress": PropValue<"Link", "onPress">;
  };
  "Pill": {
    /** The text displayed by the part. */
    "text": PropValue<"Pill", "text">;
    /** The Argo semantic tone. */
    "tone": PropValue<"Pill", "tone">;
    /** A tracker label color. */
    "color": PropValue<"Pill", "color">;
  };
  "StatusDot": {
    /** The Argo semantic status tone. */
    "tone": PropValue<"StatusDot", "tone">;
    /** The status mark size. */
    "size": PropValue<"StatusDot", "size">;
    /** Whether to animate the status pulse. */
    "pulse": PropValue<"StatusDot", "pulse">;
    /** label for this part. */
    "accessibilityLabel": PropValue<"StatusDot", "accessibilityLabel">;
  };
  "Spinner": {
    /** The visible and accessible label. */
    "accessibilityLabel": PropValue<"Spinner", "accessibilityLabel">;
  };
  "ProgressBar": {
    /** Progress from zero to one. */
    "value": PropValue<"ProgressBar", "value">;
    /** The Argo semantic tone. */
    "tone": PropValue<"ProgressBar", "tone">;
    /** Show a running sweep over the progress. */
    "active": PropValue<"ProgressBar", "active">;
    /** Optional spoken description. */
    "accessibilityLabel": PropValue<"ProgressBar", "accessibilityLabel">;
  };
  "Callout": {
    /** Error treatment; omit for information. */
    "tone": PropValue<"Callout", "tone">;
    /** Callout heading. */
    "title": PropValue<"Callout", "title">;
    /** Supporting description. */
    "description": PropValue<"Callout", "description">;
    /** Mono detail block. */
    "detail": PropValue<"Callout", "detail">;
    /** Show work in progress. */
    "busy": PropValue<"Callout", "busy">;
  };
  "EmptyState": {
    /** Optional native symbol name. */
    "icon": PropValue<"EmptyState", "icon">;
    /** The empty state heading. */
    "title": PropValue<"EmptyState", "title">;
    /** Optional supporting text. */
    "description": PropValue<"EmptyState", "description">;
  };
  "Button": {
    /** The button label. */
    "label": PropValue<"Button", "label">;
    /** The button treatment. */
    "variant": PropValue<"Button", "variant">;
    /** Semantic danger treatment. */
    "tone": PropValue<"Button", "tone">;
    /** The button size. */
    "size": PropValue<"Button", "size">;
    /** Whether activation is disabled. */
    "disabled": PropValue<"Button", "disabled">;
    /** The action run on activation. */
    "onPress": PropValue<"Button", "onPress">;
    /** An Argo icon before the label. */
    "icon": PropValue<"Button", "icon">;
    /** Fill the row always, or only in a narrow window. */
    "fullWidth": PropValue<"Button", "fullWidth">;
    /** Whether the action is running; activation is disabled. */
    "loading": PropValue<"Button", "loading">;
    /** Spoken name when the visible label says too little. */
    "accessibilityLabel": PropValue<"Button", "accessibilityLabel">;
  };
  "IconButton": {
    /** The icon drawn by the button. */
    "icon": PropValue<"IconButton", "icon">;
    /** Spoken action name. */
    "accessibilityLabel": PropValue<"IconButton", "accessibilityLabel">;
    /** Disable activation. */
    "disabled": PropValue<"IconButton", "disabled">;
    /** Action run on activation. */
    "onPress": PropValue<"IconButton", "onPress">;
    /** Danger treatment. */
    "tone": PropValue<"IconButton", "tone">;
    /** Button size. */
    "size": PropValue<"IconButton", "size">;
    /** The action is running. */
    "loading": PropValue<"IconButton", "loading">;
    /** Button treatment. */
    "variant": PropValue<"IconButton", "variant">;
    /** Toggle selection; omit for a plain button. */
    "selected": PropValue<"IconButton", "selected">;
  };
  "ButtonGroup": {

  };
  "SplitButton": {
    /** Primary action label. */
    "label": PropValue<"SplitButton", "label">;
    /** Spoken primary action name. */
    "accessibilityLabel": PropValue<"SplitButton", "accessibilityLabel">;
    /** Primary action icon. */
    "icon": PropValue<"SplitButton", "icon">;
    /** Primary action. */
    "onPress": PropValue<"SplitButton", "onPress">;
    /** Spoken secondary menu name. */
    "menuLabel": PropValue<"SplitButton", "menuLabel">;
    /** Filled treatment. */
    "primary": PropValue<"SplitButton", "primary">;
    /** Disable activation. */
    "disabled": PropValue<"SplitButton", "disabled">;
    /** Split size. */
    "size": PropValue<"SplitButton", "size">;
    /** Fill the row always, or only when narrow. */
    "fullWidth": PropValue<"SplitButton", "fullWidth">;
    /** value for this part. */
    "value": PropValue<"SplitButton", "value">;
    /** options for this part. */
    "options": PropValue<"SplitButton", "options">;
    /** Action or Plugin event invoked by onValueChange. */
    "onValueChange": PropValue<"SplitButton", "onValueChange">;
    /** actions for this part. */
    "actions": PropValue<"SplitButton", "actions">;
  };
  "ActionList": {
    /** Header buttons and overflow, or a row context menu. */
    "variant": PropValue<"ActionList", "variant">;
    /** Spoken overflow menu name. */
    "accessibilityLabel": PropValue<"ActionList", "accessibilityLabel">;
  };
  "ActionList.Section": {
    /** Optional Section heading. */
    "title": PropValue<"ActionList.Section", "title">;
  };
  "Action": {
    /** The Action label and accessible name. */
    "label": PropValue<"Action", "label">;
    /** The leading Argo icon. */
    "icon": PropValue<"Action", "icon">;
    /** Desktop shortcut; Plugins cannot take reserved keys. */
    "shortcut": PropValue<"Action", "shortcut">;
    /** Destructive Actions appear last in their own Section. */
    "tone": PropValue<"Action", "tone">;
    /** Disable activation without hiding the Action. */
    "disabled": PropValue<"Action", "disabled">;
    /** The Plugin handler or built-in App Action. */
    "onPress": PropValue<"Action", "onPress">;
  };
  "TextInput": {
    /** Spoken and visible field name. */
    "label": PropValue<"TextInput", "label">;
    /** Current field value. */
    "value": PropValue<"TextInput", "value">;
    /** Reports value edits. */
    "onChangeText": PropValue<"TextInput", "onChangeText">;
    /** Example shown while empty. */
    "placeholder": PropValue<"TextInput", "placeholder">;
    /** Draw code in the mono face. */
    "mono": PropValue<"TextInput", "mono">;
    /** Disable edits. */
    "disabled": PropValue<"TextInput", "disabled">;
    /** Value validation is running. */
    "loading": PropValue<"TextInput", "loading">;
    /** Take focus on opening. */
    "focusOnOpen": PropValue<"TextInput", "focusOnOpen">;
    /** Select the value on focus. */
    "selectOnFocus": PropValue<"TextInput", "selectOnFocus">;
    /** Submit on Return or Enter. */
    "onSubmit": PropValue<"TextInput", "onSubmit">;
    /** The field requires a value. */
    "required": PropValue<"TextInput", "required">;
    /** Use a numeric keyboard. */
    "numeric": PropValue<"TextInput", "numeric">;
    /** Mask secret entry. */
    "secure": PropValue<"TextInput", "secure">;
    /** Hide the visible label. */
    "labelHidden": PropValue<"TextInput", "labelHidden">;
  };
  "Textarea": {
    /** Current field value. */
    "value": PropValue<"Textarea", "value">;
    /** Example shown while empty. */
    "placeholder": PropValue<"Textarea", "placeholder">;
    /** Reports value edits. */
    "onChangeText": PropValue<"Textarea", "onChangeText">;
    /** Disable edits. */
    "disabled": PropValue<"Textarea", "disabled">;
  };
  "SearchField": {
    /** Search name and placeholder. */
    "label": PropValue<"SearchField", "label">;
    /** Current query. */
    "value": PropValue<"SearchField", "value">;
    /** Reports query edits. */
    "onChangeText": PropValue<"SearchField", "onChangeText">;
  };
  "Picker": {
    /** Spoken and visible selection name. */
    "label": PropValue<"Picker", "label">;
    /** Selected value. */
    "value": PropValue<"Picker", "value">;
    /** Available choices. */
    "options": PropValue<"Picker", "options">;
    /** Reports a selected value. */
    "onValueChange": PropValue<"Picker", "onValueChange">;
    /** A value is required. */
    "required": PropValue<"Picker", "required">;
    /** Text shown without a selection. */
    "placeholder": PropValue<"Picker", "placeholder">;
    /** Disable selection. */
    "disabled": PropValue<"Picker", "disabled">;
    /** Choices are loading. */
    "loading": PropValue<"Picker", "loading">;
    /** Why choices failed to load. */
    "loadError": PropValue<"Picker", "loadError">;
    /** Selection placement. */
    "variant": PropValue<"Picker", "variant">;
  };
  "FilterPill": {
    /** Filter name. */
    "label": PropValue<"FilterPill", "label">;
    /** Count after the name. */
    "count": PropValue<"FilterPill", "count">;
    /** Whether the filter is selected. */
    "selected": PropValue<"FilterPill", "selected">;
    /** Action run on activation. */
    "onPress": PropValue<"FilterPill", "onPress">;
  };
  "Combobox": {
    /** Spoken and visible selection name. */
    "label": PropValue<"Combobox", "label">;
    /** Selected value. */
    "value": PropValue<"Combobox", "value">;
    /** Searchable choices. */
    "options": PropValue<"Combobox", "options">;
    /** Reports a selected value. */
    "onValueChange": PropValue<"Combobox", "onValueChange">;
    /** A value is required. */
    "required": PropValue<"Combobox", "required">;
    /** Text shown without a selection. */
    "placeholder": PropValue<"Combobox", "placeholder">;
    /** Disable selection. */
    "disabled": PropValue<"Combobox", "disabled">;
    /** Choices are loading. */
    "loading": PropValue<"Combobox", "loading">;
    /** Why choices failed to load. */
    "loadError": PropValue<"Combobox", "loadError">;
    /** Selection placement. */
    "variant": PropValue<"Combobox", "variant">;
    /** Overlay heading. */
    "title": PropValue<"Combobox", "title">;
    /** Search hint. */
    "searchPlaceholder": PropValue<"Combobox", "searchPlaceholder">;
    /** Empty result message. */
    "emptyLabel": PropValue<"Combobox", "emptyLabel">;
    /** Action below the choices. */
    "footerAction": PropValue<"Combobox", "footerAction">;
  };
  "Checkbox": {
    /** The current on or off state. */
    "value": PropValue<"Checkbox", "value">;
    /** Called with the new on or off state. */
    "onValueChange": PropValue<"Checkbox", "onValueChange">;
    /** Whether interaction is disabled. */
    "disabled": PropValue<"Checkbox", "disabled">;
    /** The visible and accessible label. */
    "label": PropValue<"Checkbox", "label">;
    /** The option row treatment. */
    "variant": PropValue<"Checkbox", "variant">;
    /** The selection mode. */
    "selection": PropValue<"Checkbox", "selection">;
  };
  "Switch": {
    /** The current on or off state. */
    "value": PropValue<"Switch", "value">;
    /** Called with the new on or off state. */
    "onValueChange": PropValue<"Switch", "onValueChange">;
    /** Whether interaction is disabled. */
    "disabled": PropValue<"Switch", "disabled">;
    /** The spoken name; the switch draws no text. */
    "accessibilityLabel": PropValue<"Switch", "accessibilityLabel">;
  };
  "Slider": {
    /** The current range value. */
    "value": PropValue<"Slider", "value">;
    /** The lowest allowed value. */
    "minimumValue": PropValue<"Slider", "minimumValue">;
    /** The highest allowed value. */
    "maximumValue": PropValue<"Slider", "maximumValue">;
    /** The increment between allowed values. */
    "step": PropValue<"Slider", "step">;
    /** Called with the new range value. */
    "onValueChange": PropValue<"Slider", "onValueChange">;
    /** The spoken name of the range control. */
    "accessibilityLabel": PropValue<"Slider", "accessibilityLabel">;
    /** The displayed description of the current value. */
    "valueLabel": PropValue<"Slider", "valueLabel">;
    /** Whether interaction is disabled. */
    "disabled": PropValue<"Slider", "disabled">;
  };
  "DatePicker": {
    /** The visible and accessible label. */
    "label": PropValue<"DatePicker", "label">;
    /** value for this part. */
    "value": PropValue<"DatePicker", "value">;
    /** mode for this part. */
    "mode": PropValue<"DatePicker", "mode">;
  };
  "Field": {

  };
  "FieldLayout": {
    /** label for this part. */
    "label": PropValue<"FieldLayout", "label">;
  };
  "FieldDescription": {
    /** The visible and accessible label. */
    "text": PropValue<"FieldDescription", "text">;
  };
  "FieldErrors": {
    /** errors for this part. */
    "errors": PropValue<"FieldErrors", "errors">;
  };
  "Form": {
    /** The visible and accessible label. */
    "submitLabel": PropValue<"Form", "submitLabel">;
    /** Action or Plugin event invoked by onSubmit. */
    "onSubmit": PropValue<"Form", "onSubmit">;
  };
  "List": {
    /** The list appearance. */
    "appearance": PropValue<"List", "appearance">;
    /** Whether the list is loading. */
    "isLoading": PropValue<"List", "isLoading">;
    /** Input items, expanded in the worker; pair with renderItem. */
    "items": PropValue<"List", "items">;
    /** Renders one keyed child for each item; receives the item and its index. */
    "renderItem": PropValue<"List", "renderItem">;
  };
  "List.Section": {
    /** The row or section title. */
    "title": PropValue<"List.Section", "title">;
    /** A second line below the title. */
    "subtitle": PropValue<"List.Section", "subtitle">;
    /** Supporting text below the section. */
    "footer": PropValue<"List.Section", "footer">;
  };
  "ListItem": {
    /** The row or section title. */
    "title": PropValue<"ListItem", "title">;
    /** A second line below the title. */
    "subtitle": PropValue<"ListItem", "subtitle">;
    /** Optional secondary row value. */
    "value": PropValue<"ListItem", "value">;
    /** A count or status badge over the leading lane. */
    "badge": PropValue<"ListItem", "badge">;
    /** Progress along the bottom of the row. */
    "progress": PropValue<"ListItem", "progress">;
    /** Whether the item is selected. */
    "selected": PropValue<"ListItem", "selected">;
    /** Whether row activation is disabled. */
    "disabled": PropValue<"ListItem", "disabled">;
    /** Optional spoken label; defaults to title and value. */
    "accessibilityLabel": PropValue<"ListItem", "accessibilityLabel">;
    /** The action run on activation. */
    "onPress": PropValue<"ListItem", "onPress">;
  };
  "Table": {
    /** Input items, expanded in the worker; pair with renderItem. */
    "items": PropValue<"Table", "items">;
    /** Renders one keyed child for each item; receives the item and its index. */
    "renderItem": PropValue<"Table", "renderItem">;
  };
  "Metadata": {

  };
  "Alert": {
    /** Whether the alert is open. */
    "open": PropValue<"Alert", "open">;
    /** Reports dismissal. */
    "onOpenChange": PropValue<"Alert", "onOpenChange">;
    /** Question heading. */
    "title": PropValue<"Alert", "title">;
    /** Question detail. */
    "message": PropValue<"Alert", "message">;
    /** Answers offered by the alert. */
    "actions": PropValue<"Alert", "actions">;
  };
  "Dialog": {
    /** Controlled open state. */
    "open": PropValue<"Dialog", "open">;
    /** Initial uncontrolled open state. */
    "defaultOpen": PropValue<"Dialog", "defaultOpen">;
    /** Reports changes to the open state. */
    "onOpenChange": PropValue<"Dialog", "onOpenChange">;
  };
  "Sheet": {
    /** Whether the sheet is open. */
    "open": PropValue<"Sheet", "open">;
    /** Reports open state changes. */
    "onOpenChange": PropValue<"Sheet", "onOpenChange">;
    /** Spoken sheet name. */
    "label": PropValue<"Sheet", "label">;
    /** Heights the sheet may rest at. */
    "detents": PropValue<"Sheet", "detents">;
    /** Opening height. */
    "initialDetent": PropValue<"Sheet", "initialDetent">;
    /** Allow dismissal by system gestures. */
    "dismissible": PropValue<"Sheet", "dismissible">;
  };
  "Popover": {
    /** Controlled open state. */
    "open": PropValue<"Popover", "open">;
    /** Initial uncontrolled open state. */
    "defaultOpen": PropValue<"Popover", "defaultOpen">;
    /** Reports changes to the open state. */
    "onOpenChange": PropValue<"Popover", "onOpenChange">;
  };
  "Menu": {
    /** Spoken menu name. */
    "accessibilityLabel": PropValue<"Menu", "accessibilityLabel">;
    /** Disable activation. */
    "disabled": PropValue<"Menu", "disabled">;
    /** Web alignment. */
    "align": PropValue<"Menu", "align">;
    /** Choices are loading. */
    "loading": PropValue<"Menu", "loading">;
    /** value for this part. */
    "value": PropValue<"Menu", "value">;
    /** options for this part. */
    "options": PropValue<"Menu", "options">;
    /** Action or Plugin event invoked by onValueChange. */
    "onValueChange": PropValue<"Menu", "onValueChange">;
    /** groups for this part. */
    "groups": PropValue<"Menu", "groups">;
    /** actions for this part. */
    "actions": PropValue<"Menu", "actions">;
  };
  "Tooltip": {
    /** Description of the attached control. */
    "label": PropValue<"Tooltip", "label">;
  };
  "Toast": {
    /** Status heading. */
    "title": PropValue<"Toast", "title">;
    /** Status detail. */
    "message": PropValue<"Toast", "message">;
    /** Outcome tone. */
    "tone": PropValue<"Toast", "tone">;
    /** Action offered on the web. */
    "action": PropValue<"Toast", "action">;
  };
  "Page": {
    /** The visible and accessible label. */
    "title": PropValue<"Page", "title">;
    /** actions for this part. */
    "actions": PropValue<"Page", "actions">;
    /** The Page’s one primary action. */
    "primaryAction": PropValue<"Page", "primaryAction">;
    /** search for this part. */
    "search": PropValue<"Page", "search">;
  };
  "ListDetail": {

  };
  "Detail": {
    /** label for this part. */
    "title": PropValue<"Detail", "title">;
  };
  "Inspector": {
    /** label for this part. */
    "title": PropValue<"Inspector", "title">;
  };
  "Svg": {
    /** Sanitized SVG markup to draw. */
    "xml": PropValue<"Svg", "xml">;
    /** The accessible name of the artwork. */
    "label": PropValue<"Svg", "label">;
    /** The semantic artwork color. */
    "tone": PropValue<"Svg", "tone">;
    /** The artwork width divided by its height. */
    "aspectRatio": PropValue<"Svg", "aspectRatio">;
    /** The action run when the artwork is pressed. */
    "onPress": PropValue<"Svg", "onPress">;
  };
  "Chart": {
    /** data for this part. */
    "data": PropValue<"Chart", "data">;
    /** The visible and accessible label. */
    "accessibilityLabel": PropValue<"Chart", "accessibilityLabel">;
  };
  "GroupedListItem": {
    /** The row label and accessible name. */
    "label": PropValue<"GroupedListItem", "label">;
    /** Optional secondary row value. */
    "value": PropValue<"GroupedListItem", "value">;
    /** Whether row activation is disabled. */
    "disabled": PropValue<"GroupedListItem", "disabled">;
    /** The action run on activation. */
    "onPress": PropValue<"GroupedListItem", "onPress">;
  };
  "VirtualList": {
    /** Input items, expanded in the worker; pair with renderItem. */
    "items": PropValue<"VirtualList", "items">;
    /** Renders one keyed child for each item; receives the item and its index. */
    "renderItem": PropValue<"VirtualList", "renderItem">;
  };
  "GroupedList": {
    /** Input items, expanded in the worker; pair with renderItem. */
    "items": PropValue<"GroupedList", "items">;
    /** Renders one keyed child for each item; receives the item and its index. */
    "renderItem": PropValue<"GroupedList", "renderItem">;
  };
  "Text": {
    /** Text content in source order. */
    "children": PropValue<"Text", "children">;
    /** The typography role, optionally by Size class. */
    "role": PropValue<"Text", "role">;
    /** The Argo semantic text tone. */
    "tone": PropValue<"Text", "tone">;
    /** Optional spoken label; defaults to the text content. */
    "accessibilityLabel": PropValue<"Text", "accessibilityLabel">;
  };
  "Row": {
    /** A spacing token between children. */
    "gap": PropValue<"Row", "gap">;
    /** Cross-axis alignment. */
    "align": PropValue<"Row", "align">;
  };
  "Column": {
    /** A spacing token between children. */
    "gap": PropValue<"Column", "gap">;
    /** Cross-axis alignment. */
    "align": PropValue<"Column", "align">;
  };
};
