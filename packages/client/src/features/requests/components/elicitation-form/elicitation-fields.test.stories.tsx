import { settleViewport } from '@repo/kit/settle-viewport';
import { expect } from 'storybook/test';
import {
  meta as elicitationTestMeta,
  type Story,
} from '../../../../../mocks/requests/elicitation/elicitation-form-story.test.mocks';
import {
  configurationRequest,
  configurationValues,
  functionNameRequest,
  invalidSchemaRequest,
} from '../request.mocks';

const meta = { ...elicitationTestMeta, title: 'Tests/ElicitationForm' };

export default meta;

const validPort = { ...configurationValues, port: '8080' };

// Only a question card says what to choose; a form's fields need no hint.
const choiceHint = /^Choose one/;

function formFields(width: number): Story {
  return {
    args: {
      request: configurationRequest,
      initialValues: configurationValues,
    },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await expect(canvas.getByText(/1024.*65535/)).toBeVisible();
      await expect(canvas.getByText('Fix Port to submit')).toBeVisible();
      await expect(canvas.queryByText(choiceHint)).not.toBeInTheDocument();
      await expect(
        canvas.getByRole('button', { name: 'Submit' }),
      ).toBeDisabled();
      const port = canvas.getByRole('textbox', { name: 'Port' });
      await userEvent.clear(port);
      await userEvent.type(port, '3.5');
      await expect(canvas.getByText(/whole number/)).toBeVisible();
      await userEvent.clear(port);
      await userEvent.type(port, '8080');
      await userEvent.click(
        canvas.getByRole('switch', { name: 'Enable logging' }),
      );
      await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
      await expect(args.onAnswer).toHaveBeenCalledWith({
        action: 'accept',
        content: { name: 'argo-server', port: 8080, enableLogging: false },
      });
    },
  };
}

export const FormFieldsPhone = formFields(390);

export const FormFieldsWide = formFields(1440);

// The message asks for the one string, so its field is named but draws no label.
function textField(width: number): Story {
  return {
    args: { request: functionNameRequest },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await expect(
        canvas.getByRole('heading', { name: functionNameRequest.message }),
      ).toBeVisible();
      const name = canvas.getByRole('textbox', { name: 'Function name' });
      await expect(name).toHaveValue('processData');
      await expect(canvas.queryByText('Function name')).not.toBeInTheDocument();
      await expect(canvas.queryByText(choiceHint)).not.toBeInTheDocument();
      await userEvent.clear(name);
      await userEvent.type(name, 'parseConfig');
      await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
      await expect(args.onAnswer).toHaveBeenCalledWith({
        action: 'accept',
        content: { name: 'parseConfig' },
      });
    },
  };
}

export const TextFieldPhone = textField(390);

export const TextFieldWide = textField(1440);

export const SubmitWithEnter: Story = {
  args: { request: configurationRequest, initialValues: validPort },
  play: async ({ canvas, userEvent, args }) => {
    await settleViewport(1440);
    await userEvent.click(canvas.getByRole('textbox', { name: /^Name/ }));
    await userEvent.keyboard('{Enter}');
    await expect(args.onAnswer).toHaveBeenCalledTimes(1);
  },
};

// Skip declines a form, as it has no further page.
function skip(width: number): Story {
  return {
    args: { request: configurationRequest },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await userEvent.click(canvas.getByRole('button', { name: 'Skip' }));
      await expect(args.onAnswer).toHaveBeenCalledWith({ action: 'decline' });
    },
  };
}

export const SkipDeclinesPhone = skip(390);

export const SkipDeclinesWide = skip(1440);

export const DismissWide: Story = {
  args: { request: configurationRequest },
  play: async ({ canvas, userEvent, args }) => {
    await settleViewport(1440);
    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss' }));
    await expect(args.onAnswer).toHaveBeenCalledWith({ action: 'cancel' });
  },
};

export const InvalidSchema: Story = {
  args: { request: invalidSchemaRequest },
  play: async ({ canvas, userEvent, args }) => {
    await settleViewport(1440);
    await expect(canvas.getByRole('button', { name: 'Submit' })).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss' }));
    await expect(args.onAnswer).toHaveBeenCalledWith({ action: 'cancel' });
  },
};

function clearOptionalNumber(width: number): Story {
  return {
    args: { request: configurationRequest, initialValues: validPort },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await userEvent.clear(canvas.getByRole('textbox', { name: 'Port' }));
      await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
      await expect(args.onAnswer).toHaveBeenCalledWith({
        action: 'accept',
        content: { name: 'argo-server', enableLogging: true },
      });
    },
  };
}

export const ClearOptionalNumberPhone = clearOptionalNumber(390);

export const ClearOptionalNumberWide = clearOptionalNumber(1440);
