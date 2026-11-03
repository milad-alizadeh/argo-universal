import { productName } from '@repo/contracts/product-identity';
import { app, dialog } from 'electron';

export function reportUnexpectedFailure(error: string): void {
  void dialog
    .showMessageBox({
      type: 'error',
      message: `${productName} could not start the Server`,
      detail: error,
      buttons: ['Quit'],
    })
    .then((): void => app.quit());
}
