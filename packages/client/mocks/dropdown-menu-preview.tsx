import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '#primitives/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '#primitives/dropdown-menu';
import { Text } from '#primitives/text';

export function DropdownMenuPreview(): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Text>Open</Text>
        </Button>
      </DropdownMenuTrigger>
      <AccountMenu />
    </DropdownMenu>
  );
}
function AccountMenu(): React.JSX.Element {
  const contentInsets = useContentInsets();
  const props = {
    insets: contentInsets,
    sideOffset: 2,
    className: 'w-56',
    align: 'start' as const,
  };
  return (
    <DropdownMenuContent {...props}>
      <AccountItems />
      <TeamItems />
      <ExternalItems />
    </DropdownMenuContent>
  );
}
const accountItems = [
  { label: 'Profile', shortcut: '⇧⌘P' },
  { label: 'Billing', shortcut: '⌘B' },
  { label: 'Settings', shortcut: '⌘S' },
  { label: 'Keyboard shortcuts', shortcut: '⌘K' },
];
function AccountItems(): React.JSX.Element {
  return (
    <>
      <DropdownMenuLabel>My Account</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <AccountChoices />
      <DropdownMenuSeparator />
    </>
  );
}
function TeamItems(): React.JSX.Element {
  return (
    <>
      <TeamChoices />
      <DropdownMenuSeparator />
    </>
  );
}
function InviteMenu(): React.JSX.Element {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Text>Invite users</Text>
      </DropdownMenuSubTrigger>
      <InviteChoices />
    </DropdownMenuSub>
  );
}
function InviteChoices(): React.JSX.Element {
  return (
    <DropdownMenuSubContent>
      {['Email', 'Message'].map((label) => (
        <DropdownMenuItem key={label}>
          <Text>{label}</Text>
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <Text>More...</Text>
      </DropdownMenuItem>
    </DropdownMenuSubContent>
  );
}
function ExternalItems(): React.JSX.Element {
  return (
    <>
      <ExternalLinks />
      <DropdownMenuItem disabled>
        <Text>API</Text>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <LogoutItem />
    </>
  );
}

function AccountChoices(): React.JSX.Element {
  return (
    <DropdownMenuGroup>
      {accountItems.map(({ label, shortcut }) => (
        <DropdownMenuItem key={label}>
          <Text>{label}</Text>
          <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut>
        </DropdownMenuItem>
      ))}
    </DropdownMenuGroup>
  );
}

function TeamChoices(): React.JSX.Element {
  return (
    <DropdownMenuGroup>
      <DropdownMenuItem>
        <Text>Team</Text>
      </DropdownMenuItem>
      <InviteMenu />
      <DropdownMenuItem>
        <Text>New Team</Text>
        <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
      </DropdownMenuItem>
    </DropdownMenuGroup>
  );
}

function LogoutItem(): React.JSX.Element {
  return (
    <DropdownMenuItem>
      <Text>Log out</Text>
      <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
    </DropdownMenuItem>
  );
}

function useContentInsets(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  const { top, bottom } = useSafeAreaInsets();
  return { top, bottom, left: 4, right: 4 };
}

function ExternalLinks(): React.JSX.Element {
  return (
    <>
      {' '}
      {['GitHub', 'Support'].map((label) => (
        <DropdownMenuItem key={label}>
          <Text>{label}</Text>
        </DropdownMenuItem>
      ))}
    </>
  );
}
