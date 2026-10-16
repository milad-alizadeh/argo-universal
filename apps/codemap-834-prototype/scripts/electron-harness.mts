// Measurement harness using Argo's unchanged production app:// handler.
// This does not start the Server or prove the complete desktop App lifecycle.
import { app, BrowserWindow } from 'electron';
import {
  handleAppProtocol,
  registerAppScheme,
} from '../../desktop/src/main/app-protocol';

app.setPath('userData', process.env.CODEMAP_USER_DATA!);
if (process.env.CODEMAP_NO_GPU === '1') app.disableHardwareAcceleration();
registerAppScheme();
app.whenReady().then(() => {
  handleAppProtocol(process.env.CODEMAP_EXPORT!);
  const window = new BrowserWindow({
    width: 1280,
    height: 900,
    show: true,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  void window.loadURL(
    `app://app/codemap-834-prototype${process.env.CODEMAP_QUERY ?? ''}`,
  );
});
app.on('window-all-closed', () => app.quit());
