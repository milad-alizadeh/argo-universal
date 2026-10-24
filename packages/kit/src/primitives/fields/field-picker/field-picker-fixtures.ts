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

export const menu = {
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

const described = [
  { value: 'one', label: 'One', subtitle: 'The first', icon: 'folder' },
  { value: 'two', label: 'Two', subtitle: 'The second', icon: 'folder' },
  { value: 'three', label: 'Three', subtitle: 'The third', icon: 'folder' },
] as const;

// A short list shown in place as rows of its section, one chosen.
export const inline = {
  title: 'Label',
  value: 'two',
  options: described,
  presentation: 'inline',
} satisfies Fixture<FieldPickerSingle>;

export const inlineMultiple = {
  title: 'Label',
  value: ['one', 'three'],
  options: described,
  presentation: 'inline',
  multiple: true,
} satisfies Fixture<FieldPickerMultiple>;

export const screenWithSearch = {
  title: 'Label',
  value: 'cedar',
  options: sectioned,
  presentation: 'page',
  searchable: true,
} satisfies Fixture<FieldPickerSingle>;

// A page whose chosen option has a logo, which its row leads with.
export const screenWithLogo = {
  title: 'Label',
  value: 'two',
  options: [
    { value: 'one', label: 'One' },
    {
      value: 'two',
      label: 'Two',
      logo: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 8 8%22%3E%3Ccircle cx=%224%22 cy=%224%22 r=%224%22/%3E%3C/svg%3E',
    },
  ],
  presentation: 'page',
} satisfies Fixture<FieldPickerSingle>;

// A short page with no search, so its action shows below the choices without scrolling.
export const screenWithButton = {
  title: 'Label',
  value: 'two',
  options: short,
  presentation: 'page',
  footerAction: {
    label: 'Add options',
    icon: 'add',
    onPress: (): void => {},
  },
} satisfies Fixture<FieldPickerSingle>;

export const screenMultiple = {
  title: 'Label',
  value: ['alder', 'oak'],
  options: sectioned,
  presentation: 'page',
  searchable: true,
  multiple: true,
} satisfies Fixture<FieldPickerMultiple>;

export const menuMultiple = {
  title: 'Label',
  value: ['one', 'three'],
  options: short,
  presentation: 'menu',
  multiple: true,
} satisfies Fixture<FieldPickerMultiple>;

// The toolbar pill: the chosen label and a down chevron, outside a FieldGroup, opening the searchable page.
export const pill = {
  ...screenWithSearch,
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
