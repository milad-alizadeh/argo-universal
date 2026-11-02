import { app, dialog } from 'electron';

const retryChoice = 0;

// What the owner sees when the Server will not start: the one thing that can help, and a Quit.
export function reportFailure(failure: string | null, retry: () => void): void {
  void dialog
    .showMessageBox({
      type: 'error',
      message: 'Argo could not start the Server',
      detail: failure ?? undefined,
      buttons: ['Retry', 'Quit'],
      defaultId: retryChoice,
      cancelId: 1,
    })
    .then(({ response }): void => {
      if (response === retryChoice) retry();
      else app.quit();
    });
}
