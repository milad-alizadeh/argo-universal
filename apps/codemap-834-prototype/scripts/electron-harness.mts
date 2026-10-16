/*
 * Standalone protocol harness, not the complete desktop App.
 * The desktop modes in measure.mjs launch the actual App instead.
 */
import { app, BrowserWindow } from 'electron';
import {
  handleAppProtocol,
  registerAppScheme,
} from '../../desktop/src/main/app-protocol';

function required(name: string): string {
  const value = process.env[name];

  if (!value) throw new Error(`Missing ${name}`);

  return value;
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 900,
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
}

async function start(): Promise<void> {
  await app.whenReady();
  handleAppProtocol(required('CODEMAP_EXPORT'));
  createWindow();
}

app.setPath('userData', required('CODEMAP_USER_DATA'));

if (process.env.CODEMAP_NO_GPU === '1') app.disableHardwareAcceleration();

registerAppScheme();

app.on('window-all-closed', () => app.quit());

void start();
