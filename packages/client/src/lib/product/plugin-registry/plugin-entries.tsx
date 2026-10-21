import type { WirePart } from '@repo/contracts/plugins/kit';
import { ActionList, Action } from '@repo/kit/primitives/actions/action-list';
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
import { Form } from '@repo/kit/primitives/fields/form';
import { Checkbox } from '@repo/kit/primitives/inputs/checkbox';
import { DatePicker } from '@repo/kit/primitives/inputs/date-picker';
import { Picker } from '@repo/kit/primitives/inputs/picker';
import { Slider } from '@repo/kit/primitives/inputs/slider';
import { Switch } from '@repo/kit/primitives/inputs/switch';
import { TextInput } from '@repo/kit/primitives/inputs/text-input';
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
import { Page } from '@repo/kit/primitives/scaffolds/page';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import { Pill } from '@repo/kit/primitives/status/pill';
import { ProgressBar } from '@repo/kit/primitives/status/progress-bar';
import { Canvas, Svg } from '@repo/kit/primitives/visual';
import type { ComponentType } from 'react';

export const pluginEntries = {
  Markdown,
  Code,
  Link,
  Page,
  ListDetail,
  Detail,
  Metadata,
  'Metadata.Label': Metadata.Label,
  'Metadata.Link': Metadata.Link,
  'Metadata.Pills': Metadata.Pills,
  'Metadata.StatusDot': Metadata.StatusDot,
  'Metadata.Avatar': Metadata.Avatar,
  ActionList,
  'ActionList.Section': ActionList.Section,
  Action,
  EmptyState,
  Picker,
  Switch,
  Checkbox,
  Slider,
  TextInput,
  DatePicker,
  Form,
  IconButton,
  SplitButton,
  List,
  'List.Section': ListSection,
  'ListItem.Link': ListItem.Link,
  'ListItem.Button': ListItem.Button,
  'ListItem.Toggle': ListItem.Toggle,
  'ListItem.Picker': ListItem.Picker,
  'ListItem.Stepper': ListItem.Stepper,
  'ListItem.TextField': ListItem.TextField,
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
  Sheet,
} satisfies {
  [Name in WirePart]: ComponentType<KitProps<Name, string, React.JSX.Element>>;
};
