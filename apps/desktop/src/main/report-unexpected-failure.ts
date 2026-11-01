import { app, dialog } from 'electron';

export function reportUnexpectedFailure(error: string): void {
  void dialog
    .showMessageBox({
      type: 'error',
      message: 'Argo could not start the Server',
      detail: error,
      buttons: ['Quit'],
    })
    .then((): void => app.quit());
}
