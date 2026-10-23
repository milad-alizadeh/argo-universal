import type {
  FieldPickerMultiple,
  FieldPickerSingle,
} from './field-picker-model';

type Fixture<Props> = Omit<Props, 'onValueChange'>;

const short = [
  { value: 'one', label: 'One' },
  { value: 'two', label: 'Two' },
  { value: 'three', label: 'Three' },
];

export const chosen = {
  title: 'Label',
  value: 'two',
  options: short,
  presentation: 'menu',
} satisfies Fixture<FieldPickerSingle>;

// A choice that means "none" is an option whose value is the empty string.
export const emptyOption = {
  title: 'Label',
  value: 'one',
  options: [{ value: '', label: 'None' }, ...short],
  presentation: 'menu',
} satisfies Fixture<FieldPickerSingle>;

const detailed = [
  { value: 'one', label: 'One', subtitle: 'The first', icon: 'folder' },
  { value: 'two', label: 'Two', subtitle: 'The second', icon: 'folder' },
  { value: 'three', label: 'Three', subtitle: 'The third', icon: 'folder' },
] satisfies FieldPickerSingle['options'];

export const page = {
  title: 'Label',
  value: 'two',
  options: detailed,
  presentation: 'page',
} satisfies Fixture<FieldPickerSingle>;

const names = [
  'Alder',
  'Aspen',
  'Beech',
  'Birch',
  'Cedar',
  'Cherry',
  'Chestnut',
  'Cypress',
  'Dogwood',
  'Elder',
  'Elm',
  'Fir',
  'Ginkgo',
  'Hazel',
  'Hawthorn',
  'Hemlock',
  'Hickory',
  'Holly',
  'Juniper',
  'Larch',
  'Linden',
  'Magnolia',
  'Maple',
  'Mulberry',
  'Oak',
  'Olive',
  'Palm',
  'Pear',
  'Pine',
  'Plane',
  'Plum',
  'Poplar',
  'Redwood',
  'Rowan',
  'Spruce',
  'Sycamore',
  'Teak',
  'Walnut',
  'Willow',
  'Yew',
];

const sectioned = names.map((name, index) => ({
  value: name.toLowerCase(),
  label: name,
  subtitle: `Option ${index + 1}`,
  section: index < 2 ? 'Recent' : 'All',
}));

export const pageSearchable = {
  title: 'Label',
  value: 'cedar',
  options: sectioned,
  presentation: 'page',
  searchable: true,
} satisfies Fixture<FieldPickerSingle>;

export const pageAction = {
  ...pageSearchable,
  footerAction: { label: 'Add options', onPress: (): void => {} },
} satisfies Fixture<FieldPickerSingle>;

export const multiple = {
  title: 'Label',
  value: ['alder', 'oak'],
  options: sectioned,
  presentation: 'page',
  searchable: true,
  multiple: true,
} satisfies Fixture<FieldPickerMultiple>;

export const multipleMenu = {
  title: 'Label',
  value: ['one', 'three'],
  options: short,
  presentation: 'menu',
  multiple: true,
} satisfies Fixture<FieldPickerMultiple>;

// The toolbar pill: the chosen label and a down chevron, outside a FieldGroup, opening the searchable page.
export const pill = {
  ...pageSearchable,
  trigger: 'pill',
  leading: 'folder',
} satisfies Fixture<FieldPickerSingle>;

export const pillLoading = {
  ...pill,
  loading: true,
} satisfies Fixture<FieldPickerSingle>;

export const pillLoadError = {
  ...pill,
  loadError: 'Could not load options.',
} satisfies Fixture<FieldPickerSingle>;
