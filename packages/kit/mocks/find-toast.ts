import { expect, screen, waitFor, within } from 'storybook/test';

const notifications = { name: /^Notifications/ };

// A toast's text once it has faded in, inside the live region that announces it.
export async function findToast(text: string): Promise<HTMLElement> {
  const region = await screen.findByRole('region', notifications);

  return waitFor(async () => {
    const toast = within(region).getByText(text);
    await expect(toast).toBeVisible();

    return toast;
  });
}

// Every toast that shows this text, to prove a failure toasts only once.
export async function allToasts(text: string): Promise<HTMLElement[]> {
  const region = await screen.findByRole('region', notifications);

  return within(region).queryAllByText(text);
}
