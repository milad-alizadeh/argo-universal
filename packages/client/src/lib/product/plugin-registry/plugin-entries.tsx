import type { WireComponentName } from '@repo/contracts/plugins/kit';
import { Action } from '@repo/kit/primitives/actions/action';
import { Button } from '@repo/kit/primitives/actions/button';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { SplitButton } from '@repo/kit/primitives/actions/split-button';
import { Audio } from '@repo/kit/primitives/content/audio';
import { Avatar } from '@repo/kit/primitives/content/avatar';
import { Code } from '@repo/kit/primitives/content/code';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Image } from '@repo/kit/primitives/content/image';
import { Label } from '@repo/kit/primitives/content/label';
import { Link } from '@repo/kit/primitives/content/link';
import { Markdown } from '@repo/kit/primitives/content/markdown';
import { Text } from '@repo/kit/primitives/content/text';
import { Video } from '@repo/kit/primitives/content/video';
import { SegmentedControl } from '@repo/kit/primitives/controls/segmented-control';
import { Slider } from '@repo/kit/primitives/controls/slider';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type { KitProps } from '@repo/kit/primitives/kit-props';
import { Card } from '@repo/kit/primitives/layout/card';
import { Grid } from '@repo/kit/primitives/layout/grid';
import { ScrollView } from '@repo/kit/primitives/layout/scroll-view';
import { Spacer } from '@repo/kit/primitives/layout/spacer';
import { Stack } from '@repo/kit/primitives/layout/stack';
import { Surface } from '@repo/kit/primitives/layout/surface';
import { List, ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import { Table } from '@repo/kit/primitives/lists/table';
import { Alert } from '@repo/kit/primitives/overlays/alert';
import { Sheet } from '@repo/kit/primitives/overlays/sheet';
import { Detail } from '@repo/kit/primitives/scaffolds/detail';
import { ListDetail } from '@repo/kit/primitives/scaffolds/list-detail';
import { Metadata } from '@repo/kit/primitives/scaffolds/metadata';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import { Pill } from '@repo/kit/primitives/status/pill';
import { ProgressBar } from '@repo/kit/primitives/status/progress-bar';
import { Canvas, Chart, Svg } from '@repo/kit/primitives/visual';
import type { ComponentType } from 'react';

// A Plugin's sheet holds composed content, so it takes the standard sheet inset.
function PluginSheet(
  props: KitProps<'Sheet', string, React.JSX.Element>,
): React.JSX.Element {
  return <Sheet {...props} inset />;
}

export const pluginEntries = {
  Markdown,
  Code,
  Link,
  Screen,
  ListDetail,
  Detail,
  Metadata,
  'Metadata.Label': Metadata.Label,
  'Metadata.Link': Metadata.Link,
  'Metadata.Pills': Metadata.Pills,
  'Metadata.StatusDot': Metadata.StatusDot,
  'Metadata.Avatar': Metadata.Avatar,
  Action,
  'Action.Section': Action.Section,
  EmptyState,
  Slider,
  SegmentedControl,
  FieldGroup,
  'FieldGroup.Section': FieldGroup.Section,
  'FieldGroup.Value': FieldGroup.Value,
  'FieldGroup.Link': FieldGroup.Link,
  'FieldGroup.Toggle': FieldGroup.Toggle,
  'FieldGroup.Picker': FieldGroup.Picker,
  'FieldGroup.DatePicker': FieldGroup.DatePicker,
  'FieldGroup.Slider': FieldGroup.Slider,
  'FieldGroup.TextField': FieldGroup.TextField,
  'FieldGroup.SecretField': FieldGroup.SecretField,
  IconButton,
  SplitButton,
  List,
  'List.Section': ListSection,
  ListItem,
  Table,
  'Table.Row': Table.Row,
  'Table.Cell': Table.Cell,
  Label,
  ProgressBar,
  Pill,
  Text,
  Button,
  Stack,
  Spacer,
  Card,
  Grid,
  Surface,
  ScrollView,
  Svg,
  Chart,
  Canvas,
  'Canvas.Rect': Canvas.Rect,
  'Canvas.Circle': Canvas.Circle,
  'Canvas.Line': Canvas.Line,
  'Canvas.Path': Canvas.Path,
  'Canvas.Text': Canvas.Text,
  'Canvas.Group': Canvas.Group,
  Video,
  Audio,
  Image,
  Avatar,
  Icon,
  Alert,
  Sheet: PluginSheet,
} satisfies {
  [Name in WireComponentName]: ComponentType<
    KitProps<Name, string, React.JSX.Element>
  >;
};
