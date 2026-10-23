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

  };
  "Grid": {
    /** Equal columns, optionally per Size class. Phones draw at most two. */
    "columns": PropValue<"Grid", "columns">;
    /** Spacing token between cells. */
    "gap": PropValue<"Grid", "gap">;
  };
  "Surface": {
    /** Named Surface with its fill, radius and depth. */
    "kind": PropValue<"Surface", "kind">;
    /** Spacing token inside the Surface. */
    "padding": PropValue<"Surface", "padding">;
    /** Action run on activation. */
    "onPress": PropValue<"Surface", "onPress">;
  };
  "Card": {
    /** The card title on its header line. */
    "title": PropValue<"Card", "title">;
    /** A second line below the title. */
    "subtitle": PropValue<"Card", "subtitle">;
    /** The card's spoken name; defaults to title and subtitle. */
    "accessibilityLabel": PropValue<"Card", "accessibilityLabel">;
    /** Action run when the card is pressed. */
    "onPress": PropValue<"Card", "onPress">;
  };
  "ScrollView": {
    /** Spoken name of the scroll region. */
    "accessibilityLabel": PropValue<"ScrollView", "accessibilityLabel">;
    /** Scroll direction. */
    "direction": PropValue<"ScrollView", "direction">;
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
    "size": PropValue<"Icon", "size">;
    /** Use the platform filled variant. */
    "filled": PropValue<"Icon", "filled">;
    /** Semantic symbol tone. */
    "tone": PropValue<"Icon", "tone">;
    /** Status mark over the symbol. */
    "status": PropValue<"Icon", "status">;
  };
  "Image": {
    /** Image resolved by argo.assets.resolve; loaded through the Server. */
    "source": PropValue<"Image", "source">;
    /** Appearance-specific sources, falling back to light then source. */
    "sources": PropValue<"Image", "sources">;
    /** Frame aspect, or the image’s intrinsic ratio. */
    "aspect": PropValue<"Image", "aspect">;
    /** Fill and crop, or show the whole image. */
    "fit": PropValue<"Image", "fit">;
    /** Semantic frame radius. */
    "radius": PropValue<"Image", "radius">;
    /** Spoken description of the image. */
    "accessibilityLabel": PropValue<"Image", "accessibilityLabel">;
  };
  "Video": {
    /** The video, from `argo.assets.resolve`: a Plugin file, or a remote URL the Server fetched. */
    "source": PropValue<"Video", "source">;
    /** poster for this part. */
    "poster": PropValue<"Video", "poster">;
    /** Frame aspect: landscape 16:9 (default), square 1:1, portrait 9:16. */
    "aspect": PropValue<"Video", "aspect">;
    /** Corner radius token: control (default) or none. */
    "radius": PropValue<"Video", "radius">;
    /** Play at once, muted and looping, with the controls hidden until tapped. Stays paused with Reduce Motion. */
    "autoPlay": PropValue<"Video", "autoPlay">;
    /** Spoken name of the video. */
    "accessibilityLabel": PropValue<"Video", "accessibilityLabel">;
  };
  "Audio": {
    /** The audio, from `argo.assets.resolve`: a Plugin file, or a remote URL the Server fetched. */
    "source": PropValue<"Audio", "source">;
    /** Spoken name of the audio; names its play button and scrubber. */
    "accessibilityLabel": PropValue<"Audio", "accessibilityLabel">;
  };
  "Label": {
    /** An optional Argo icon name or an SF and Material symbol pair; without one the Label shows only its text. */
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
    /** Name used for fallback initials; absent names show a person symbol. */
    "name": PropValue<"Avatar", "name">;
    /** Avatar resolved by argo.assets.resolve; loaded through the Server. */
    "src": PropValue<"Avatar", "src">;
    /** Avatar size. */
    "size": PropValue<"Avatar", "size">;
    /** Spoken identity. */
    "accessibilityLabel": PropValue<"Avatar", "accessibilityLabel">;
    /** Status mark over the avatar. */
    "status": PropValue<"Avatar", "status">;
  };
  "Markdown": {
    /** Markdown source text. */
    "text": PropValue<"Markdown", "text">;
    /** Show a caret at the end of the content. */
    "streaming": PropValue<"Markdown", "streaming">;
  };
  "Code": {
    /** Plain text to display and copy. */
    "code": PropValue<"Code", "code">;
    /** Language tag for syntax highlighting. */
    "language": PropValue<"Code", "language">;
    /** File path shown in the header. */
    "path": PropValue<"Code", "path">;
    /** Diff hunks; Copy copies their patch and long diffs start with five lines. */
    "diff": PropValue<"Code", "diff">;
  };
  "Link": {
    /** Visible link label. */
    "label": PropValue<"Link", "label">;
    /** An http, https or mailto URL. */
    "href": PropValue<"Link", "href">;
    /** An absolute route within the App. */
    "route": PropValue<"Link", "route">;
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
    /** accessibility Label for this part. */
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
    /** Draw the filled icon, for a button that is on. */
    "selected": PropValue<"IconButton", "selected">;
    /** Button size. */
    "size": PropValue<"IconButton", "size">;
    /** Button treatment. */
    "variant": PropValue<"IconButton", "variant">;
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
    /** The leading Argo icon; a header ActionList shows only Actions with one as buttons, and a submenu needs one. */
    "icon": PropValue<"Action", "icon">;
    /** Desktop shortcut; Plugins cannot take reserved keys. */
    "shortcut": PropValue<"Action", "shortcut">;
    /** Destructive Actions appear last in their own Section. */
    "tone": PropValue<"Action", "tone">;
    /** Disable activation without hiding the Action. */
    "disabled": PropValue<"Action", "disabled">;
    /** The Plugin handler or built-in App Action. */
    "onPress": PropValue<"Action", "onPress">;
    /** An Alert answer that dismisses the question, or one that destroys data. */
    "role": PropValue<"Action", "role">;
    /** Check this Action as its Section's chosen option; pass false on the others. */
    "selected": PropValue<"Action", "selected">;
    /** A count or status dot on the icon. */
    "badge": PropValue<"Action", "badge">;
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
    /** Selected values. */
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
    /** Pick several values. */
    "multiple": PropValue<"Picker", "multiple">;
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
    /** The option row treatment, or inline beside other content and sized to its label. */
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
    /** Spoken and visible field name. */
    "label": PropValue<"DatePicker", "label">;
    /** Local ISO value: `YYYY-MM-DD`, `HH:mm`, or `YYYY-MM-DDTHH:mm` by mode. */
    "value": PropValue<"DatePicker", "value">;
    /** Pick a date, a time, or both. */
    "mode": PropValue<"DatePicker", "mode">;
    /** Reports a picked value. */
    "onValueChange": PropValue<"DatePicker", "onValueChange">;
    /** The field requires a value. */
    "required": PropValue<"DatePicker", "required">;
    /** Disable picking. */
    "disabled": PropValue<"DatePicker", "disabled">;
  };
  "FieldGroup": {
    /** Every row holds still. */
    "disabled": PropValue<"FieldGroup", "disabled">;
  };
  "FieldGroup.Section": {
    /** The heading above the section. */
    "title": PropValue<"FieldGroup.Section", "title">;
    /** Supporting text below the section. */
    "footer": PropValue<"FieldGroup.Section", "footer">;
  };
  "FieldGroup.Value": {
    /** The row’s label. */
    "title": PropValue<"FieldGroup.Value", "title">;
    /** Whether the row is disabled. */
    "disabled": PropValue<"FieldGroup.Value", "disabled">;
    /** A leading SF Symbol and Material Symbol. */
    "leading": PropValue<"FieldGroup.Value", "leading">;
    /** The read-only value at the row’s end. */
    "value": PropValue<"FieldGroup.Value", "value">;
  };
  "FieldGroup.Link": {
    /** The row’s label. */
    "title": PropValue<"FieldGroup.Link", "title">;
    /** Whether the row is disabled. */
    "disabled": PropValue<"FieldGroup.Link", "disabled">;
    /** A leading SF Symbol and Material Symbol. */
    "leading": PropValue<"FieldGroup.Link", "leading">;
    /** Action or Plugin event invoked by onPress. */
    "onPress": PropValue<"FieldGroup.Link", "onPress">;
  };
  "FieldGroup.Toggle": {
    /** The row’s label. */
    "title": PropValue<"FieldGroup.Toggle", "title">;
    /** Whether the row is disabled. */
    "disabled": PropValue<"FieldGroup.Toggle", "disabled">;
    /** Whether the field is on. */
    "value": PropValue<"FieldGroup.Toggle", "value">;
    /** Action or Plugin event invoked by onValueChange. */
    "onValueChange": PropValue<"FieldGroup.Toggle", "onValueChange">;
  };
  "FieldGroup.Picker": {
    /** The row’s label. */
    "title": PropValue<"FieldGroup.Picker", "title">;
    /** Whether the row is disabled. */
    "disabled": PropValue<"FieldGroup.Picker", "disabled">;
    /** A leading SF Symbol and Material Symbol. */
    "leading": PropValue<"FieldGroup.Picker", "leading">;
    /** The chosen option value, or the list of them when `multiple`. */
    "value": PropValue<"FieldGroup.Picker", "value">;
    /** The options to choose from. */
    "options": PropValue<"FieldGroup.Picker", "options">;
    /** Where the choices open: `menu` in place, for a short known list; `page` on a page of their own, for a long or searchable one. */
    "presentation": PropValue<"FieldGroup.Picker", "presentation">;
    /** A search field above the choices; only a `page` has one. */
    "searchable": PropValue<"FieldGroup.Picker", "searchable">;
    /** Several options can be chosen; `value` is then a list. */
    "multiple": PropValue<"FieldGroup.Picker", "multiple">;
    /** A button in a section of its own below the choices of a `page`, such as "Add Agents". */
    "footerAction": PropValue<"FieldGroup.Picker", "footerAction">;
    /** Action or Plugin event invoked by onValueChange. */
    "onValueChange": PropValue<"FieldGroup.Picker", "onValueChange">;
  };
  "FieldGroup.Slider": {
    /** The row’s label. */
    "title": PropValue<"FieldGroup.Slider", "title">;
    /** Whether the row is disabled. */
    "disabled": PropValue<"FieldGroup.Slider", "disabled">;
    /** The current value. */
    "value": PropValue<"FieldGroup.Slider", "value">;
    /** The minimum value. */
    "min": PropValue<"FieldGroup.Slider", "min">;
    /** The maximum value. */
    "max": PropValue<"FieldGroup.Slider", "max">;
    /** The increment. */
    "step": PropValue<"FieldGroup.Slider", "step">;
    /** Action or Plugin event invoked by onValueChange. */
    "onValueChange": PropValue<"FieldGroup.Slider", "onValueChange">;
  };
  "FieldGroup.TextField": {
    /** The row’s label. */
    "title": PropValue<"FieldGroup.TextField", "title">;
    /** Whether the row is disabled. */
    "disabled": PropValue<"FieldGroup.TextField", "disabled">;
    /** A leading SF Symbol and Material Symbol. */
    "leading": PropValue<"FieldGroup.TextField", "leading">;
    /** The current text. */
    "value": PropValue<"FieldGroup.TextField", "value">;
    /** Action or Plugin event invoked by onChangeText. */
    "onChangeText": PropValue<"FieldGroup.TextField", "onChangeText">;
    /** Example shown while empty. */
    "placeholder": PropValue<"FieldGroup.TextField", "placeholder">;
    /** Why the value is not accepted. */
    "error": PropValue<"FieldGroup.TextField", "error">;
    /** The keyboard Expo UI TextInput shows; a number is a number-pad or decimal-pad. */
    "keyboardType": PropValue<"FieldGroup.TextField", "keyboardType">;
    /** on Blur for this part. */
    "onBlur": PropValue<"FieldGroup.TextField", "onBlur">;
    /** on Submit for this part. */
    "onSubmit": PropValue<"FieldGroup.TextField", "onSubmit">;
  };
  "FieldGroup.SecretField": {
    /** The row’s label. */
    "title": PropValue<"FieldGroup.SecretField", "title">;
    /** Whether the row is disabled. */
    "disabled": PropValue<"FieldGroup.SecretField", "disabled">;
    /** A leading SF Symbol and Material Symbol. */
    "leading": PropValue<"FieldGroup.SecretField", "leading">;
    /** The current text. */
    "value": PropValue<"FieldGroup.SecretField", "value">;
    /** Action or Plugin event invoked by onChangeText. */
    "onChangeText": PropValue<"FieldGroup.SecretField", "onChangeText">;
    /** Example shown while empty. */
    "placeholder": PropValue<"FieldGroup.SecretField", "placeholder">;
    /** Why the value is not accepted. */
    "error": PropValue<"FieldGroup.SecretField", "error">;
    /** The keyboard Expo UI TextInput shows; a number is a number-pad or decimal-pad. */
    "keyboardType": PropValue<"FieldGroup.SecretField", "keyboardType">;
    /** on Blur for this part. */
    "onBlur": PropValue<"FieldGroup.SecretField", "onBlur">;
    /** on Submit for this part. */
    "onSubmit": PropValue<"FieldGroup.SecretField", "onSubmit">;
  };
  "List": {
    /** Rows or media tiles. */
    "layout": PropValue<"List", "layout">;
    /** Vertical content or a horizontal shelf. */
    "direction": PropValue<"List", "direction">;
    /** Column count, capped at 2/4/6 by Size class; auto fits tileSize. */
    "columns": PropValue<"List", "columns">;
    /** Minimum tile width; phones cap grids at two columns, lg at one. */
    "tileSize": PropValue<"List", "tileSize">;
    /** Media aspect: square 1:1, landscape 16:10, portrait 3:4. */
    "aspect": PropValue<"List", "aspect">;
    /** The list appearance. */
    "appearance": PropValue<"List", "appearance">;
    /** Page-level supporting text. */
    "footer": PropValue<"List", "footer">;
    /** Whether the list is loading. */
    "isLoading": PropValue<"List", "isLoading">;
    /** Input items, expanded in the worker; pair with renderItem. */
    "items": PropValue<"List", "items">;
    /** Renders one keyed child for each item; receives the item and its index. */
    "renderItem": PropValue<"List", "renderItem">;
  };
  "List.Section": {
    /** The section choice mode. */
    "selectionMode": PropValue<"List.Section", "selectionMode">;
    /** Selected row ids. */
    "selection": PropValue<"List.Section", "selection">;
    /** on Selection Change for this part. */
    "onSelectionChange": PropValue<"List.Section", "onSelectionChange">;
    /** The row or section title. */
    "title": PropValue<"List.Section", "title">;
    /** A second line below the title. */
    "subtitle": PropValue<"List.Section", "subtitle">;
    /** Supporting text below the section. */
    "footer": PropValue<"List.Section", "footer">;
  };
  "ListItem": {
    /** The row identity within a choice section. */
    "id": PropValue<"ListItem", "id">;
    /** Footer on iOS and desktop; supporting text on Android. */
    "description": PropValue<"ListItem", "description">;
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
    /** The columns in order; the first one names each row. */
    "columns": PropValue<"Table", "columns">;
    /** Compact widths draw a list of rows, or keep the grid and scroll sideways. */
    "compactLayout": PropValue<"Table", "compactLayout">;
    /** The sorted column; the Plugin sorts the rows. */
    "sort": PropValue<"Table", "sort">;
    /** on Sort Change for this part. */
    "onSortChange": PropValue<"Table", "onSortChange">;
    /** The row choice mode. */
    "selectionMode": PropValue<"Table", "selectionMode">;
    /** Selected row ids. */
    "selection": PropValue<"Table", "selection">;
    /** on Selection Change for this part. */
    "onSelectionChange": PropValue<"Table", "onSelectionChange">;
    /** Spoken name of the table. */
    "accessibilityLabel": PropValue<"Table", "accessibilityLabel">;
    /** Input items, expanded in the worker; pair with renderItem. */
    "items": PropValue<"Table", "items">;
    /** Renders one keyed child for each item; receives the item and its index. */
    "renderItem": PropValue<"Table", "renderItem">;
  };
  "Table.Row": {
    /** The row identity for selection. */
    "id": PropValue<"Table.Row", "id">;
    /** Optional spoken label; defaults to the cell texts. */
    "accessibilityLabel": PropValue<"Table.Row", "accessibilityLabel">;
    /** The primary action, run on activation at regular widths. */
    "onPress": PropValue<"Table.Row", "onPress">;
  };
  "Table.Cell": {
    /** The id of the column this cell fills. */
    "column": PropValue<"Table.Cell", "column">;
    /** The cell text; also the spoken and compact value. */
    "text": PropValue<"Table.Cell", "text">;
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
    /** The single-line page title. */
    "title": PropValue<"Page", "title">;
    /** A muted line under the title on wide windows; phones hide it. */
    "caption": PropValue<"Page", "caption">;
    /** Native search on phones; expanding header search on web. */
    "search": PropValue<"Page", "search">;
    /** The search query; drafts stay in the App. */
    "value": PropValue<"Page", "value">;
    /** Receive the search query when it changes. */
    "onChangeText": PropValue<"Page", "onChangeText">;
  };
  "ListDetail": {

  };
  "Inspector": {
    /** The Inspector heading; on compact screens, the sheet title. */
    "title": PropValue<"Inspector", "title">;
    /** Whether the Inspector is shown. */
    "open": PropValue<"Inspector", "open">;
    /** Reports the Inspector closing, by its close button, a swipe down, Escape or Back. */
    "onOpenChange": PropValue<"Inspector", "onOpenChange">;
  };
  "SettingsLayout": {
    /** The settings pages, in groups, optionally by Size class. */
    "sections": PropValue<"SettingsLayout", "sections">;
    /** The id of the page shown, whose row a wide window marks. */
    "selected": PropValue<"SettingsLayout", "selected">;
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
    /** kind for this part. */
    "kind": PropValue<"Chart", "kind">;
    /** label for this part. */
    "label": PropValue<"Chart", "label">;
    /** stacked for this part. */
    "stacked": PropValue<"Chart", "stacked">;
    /** The action run when the artwork is pressed. */
    "onPress": PropValue<"Chart", "onPress">;
    /** series for this part. */
    "series": PropValue<"Chart", "series">;
  };
  "Detail": {
    /** The content drawn by the kit Markdown part. */
    "markdown": PropValue<"Detail", "markdown">;
    /** Show the content loading state; the Metadata stays. */
    "isLoading": PropValue<"Detail", "isLoading">;
  };
  "Metadata": {
    /** Optional section heading. */
    "title": PropValue<"Metadata", "title">;
  };
  "Metadata.Label": {
    /** The field label. */
    "title": PropValue<"Metadata.Label", "title">;
    /** Override the spoken field name and value. */
    "accessibilityLabel": PropValue<"Metadata.Label", "accessibilityLabel">;
    /** The field value. */
    "text": PropValue<"Metadata.Label", "text">;
    /** icon for this part. */
    "icon": PropValue<"Metadata.Label", "icon">;
  };
  "Metadata.Link": {
    /** The field label. */
    "title": PropValue<"Metadata.Link", "title">;
    /** Override the spoken field name and value. */
    "accessibilityLabel": PropValue<"Metadata.Link", "accessibilityLabel">;
    /** The displayed link text; drawn as plain text until kit Link lands. */
    "text": PropValue<"Metadata.Link", "text">;
    /** The link destination. */
    "href": PropValue<"Metadata.Link", "href">;
  };
  "Metadata.Pills": {
    /** The field label. */
    "title": PropValue<"Metadata.Pills", "title">;
    /** Override the spoken field name and value. */
    "accessibilityLabel": PropValue<"Metadata.Pills", "accessibilityLabel">;
  };
  "Metadata.StatusDot": {
    /** The field label. */
    "title": PropValue<"Metadata.StatusDot", "title">;
    /** Override the spoken field name and value. */
    "accessibilityLabel": PropValue<"Metadata.StatusDot", "accessibilityLabel">;
    /** The status text. */
    "text": PropValue<"Metadata.StatusDot", "text">;
    /** tone for this part. */
    "tone": PropValue<"Metadata.StatusDot", "tone">;
  };
  "Metadata.Avatar": {
    /** The field label. */
    "title": PropValue<"Metadata.Avatar", "title">;
    /** Override the spoken field name and value. */
    "accessibilityLabel": PropValue<"Metadata.Avatar", "accessibilityLabel">;
    /** The person’s displayed name. */
    "name": PropValue<"Metadata.Avatar", "name">;
    /** Optional avatar image URI. */
    "src": PropValue<"Metadata.Avatar", "src">;
  };
  "Canvas": {
    /** label for this part. */
    "label": PropValue<"Canvas", "label">;
    /** width for this part. */
    "width": PropValue<"Canvas", "width">;
    /** height for this part. */
    "height": PropValue<"Canvas", "height">;
    /** aspect Ratio for this part. */
    "aspectRatio": PropValue<"Canvas", "aspectRatio">;
    /** camera for this part. */
    "camera": PropValue<"Canvas", "camera">;
    /** selected Key for this part. */
    "selectedKey": PropValue<"Canvas", "selectedKey">;
  };
  "Canvas.Rect": {
    /** tone for this part. */
    "tone": PropValue<"Canvas.Rect", "tone">;
    /** intensity for this part. */
    "intensity": PropValue<"Canvas.Rect", "intensity">;
    /** fill for this part. */
    "fill": PropValue<"Canvas.Rect", "fill">;
    /** stroke for this part. */
    "stroke": PropValue<"Canvas.Rect", "stroke">;
    /** stroke Width for this part. */
    "strokeWidth": PropValue<"Canvas.Rect", "strokeWidth">;
    /** label for this part. */
    "label": PropValue<"Canvas.Rect", "label">;
    /** The action run when the artwork is pressed. */
    "onPress": PropValue<"Canvas.Rect", "onPress">;
    /** x for this part. */
    "x": PropValue<"Canvas.Rect", "x">;
    /** y for this part. */
    "y": PropValue<"Canvas.Rect", "y">;
    /** width for this part. */
    "width": PropValue<"Canvas.Rect", "width">;
    /** height for this part. */
    "height": PropValue<"Canvas.Rect", "height">;
    /** rx for this part. */
    "rx": PropValue<"Canvas.Rect", "rx">;
    /** ry for this part. */
    "ry": PropValue<"Canvas.Rect", "ry">;
  };
  "Canvas.Circle": {
    /** tone for this part. */
    "tone": PropValue<"Canvas.Circle", "tone">;
    /** intensity for this part. */
    "intensity": PropValue<"Canvas.Circle", "intensity">;
    /** fill for this part. */
    "fill": PropValue<"Canvas.Circle", "fill">;
    /** stroke for this part. */
    "stroke": PropValue<"Canvas.Circle", "stroke">;
    /** stroke Width for this part. */
    "strokeWidth": PropValue<"Canvas.Circle", "strokeWidth">;
    /** label for this part. */
    "label": PropValue<"Canvas.Circle", "label">;
    /** The action run when the artwork is pressed. */
    "onPress": PropValue<"Canvas.Circle", "onPress">;
    /** cx for this part. */
    "cx": PropValue<"Canvas.Circle", "cx">;
    /** cx for this part. */
    "cy": PropValue<"Canvas.Circle", "cy">;
    /** cx for this part. */
    "r": PropValue<"Canvas.Circle", "r">;
  };
  "Canvas.Line": {
    /** tone for this part. */
    "tone": PropValue<"Canvas.Line", "tone">;
    /** intensity for this part. */
    "intensity": PropValue<"Canvas.Line", "intensity">;
    /** fill for this part. */
    "fill": PropValue<"Canvas.Line", "fill">;
    /** stroke for this part. */
    "stroke": PropValue<"Canvas.Line", "stroke">;
    /** stroke Width for this part. */
    "strokeWidth": PropValue<"Canvas.Line", "strokeWidth">;
    /** label for this part. */
    "label": PropValue<"Canvas.Line", "label">;
    /** The action run when the artwork is pressed. */
    "onPress": PropValue<"Canvas.Line", "onPress">;
    /** cx for this part. */
    "x1": PropValue<"Canvas.Line", "x1">;
    /** cx for this part. */
    "y1": PropValue<"Canvas.Line", "y1">;
    /** cx for this part. */
    "x2": PropValue<"Canvas.Line", "x2">;
    /** cx for this part. */
    "y2": PropValue<"Canvas.Line", "y2">;
  };
  "Canvas.Path": {
    /** tone for this part. */
    "tone": PropValue<"Canvas.Path", "tone">;
    /** intensity for this part. */
    "intensity": PropValue<"Canvas.Path", "intensity">;
    /** fill for this part. */
    "fill": PropValue<"Canvas.Path", "fill">;
    /** stroke for this part. */
    "stroke": PropValue<"Canvas.Path", "stroke">;
    /** stroke Width for this part. */
    "strokeWidth": PropValue<"Canvas.Path", "strokeWidth">;
    /** label for this part. */
    "label": PropValue<"Canvas.Path", "label">;
    /** The action run when the artwork is pressed. */
    "onPress": PropValue<"Canvas.Path", "onPress">;
    /** d for this part. */
    "d": PropValue<"Canvas.Path", "d">;
  };
  "Canvas.Text": {
    /** tone for this part. */
    "tone": PropValue<"Canvas.Text", "tone">;
    /** intensity for this part. */
    "intensity": PropValue<"Canvas.Text", "intensity">;
    /** fill for this part. */
    "fill": PropValue<"Canvas.Text", "fill">;
    /** stroke for this part. */
    "stroke": PropValue<"Canvas.Text", "stroke">;
    /** stroke Width for this part. */
    "strokeWidth": PropValue<"Canvas.Text", "strokeWidth">;
    /** label for this part. */
    "label": PropValue<"Canvas.Text", "label">;
    /** The action run when the artwork is pressed. */
    "onPress": PropValue<"Canvas.Text", "onPress">;
    /** x for this part. */
    "x": PropValue<"Canvas.Text", "x">;
    /** y for this part. */
    "y": PropValue<"Canvas.Text", "y">;
    /** text for this part. */
    "text": PropValue<"Canvas.Text", "text">;
  };
  "Canvas.Group": {
    /** tone for this part. */
    "tone": PropValue<"Canvas.Group", "tone">;
    /** intensity for this part. */
    "intensity": PropValue<"Canvas.Group", "intensity">;
    /** fill for this part. */
    "fill": PropValue<"Canvas.Group", "fill">;
    /** stroke for this part. */
    "stroke": PropValue<"Canvas.Group", "stroke">;
    /** stroke Width for this part. */
    "strokeWidth": PropValue<"Canvas.Group", "strokeWidth">;
    /** label for this part. */
    "label": PropValue<"Canvas.Group", "label">;
    /** on Press for this part. */
    "onPress": PropValue<"Canvas.Group", "onPress">;
    /** translate for this part. */
    "translate": PropValue<"Canvas.Group", "translate">;
    /** scale for this part. */
    "scale": PropValue<"Canvas.Group", "scale">;
    /** rotate for this part. */
    "rotate": PropValue<"Canvas.Group", "rotate">;
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
};
