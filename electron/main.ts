import { app, BrowserWindow, dialog } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';

const PORT = 4000;

let serverProcess: any = null;
let mainWindow: any = null;

function getDataDir() {
  return path.join(app.getPath('appData'), 'Cijferwerk');
}

function getDbPath() {
  return path.join(getDataDir(), 'data', 'cijferwerk.db');
}

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.mkdirSync(getDataDir(), { recursive: true });
    fs.appendFileSync(path.join(getDataDir(), 'debug.log'), line);
  } catch {}
  console.log(msg);
}

function ensureDataDir() {
  const dataDir = getDataDir();
  const dbPath = getDbPath();
  fs.mkdirSync(path.join(dataDir, 'data', 'uploads'), { recursive: true });

  if (!fs.existsSync(dbPath)) {
    const templatePath = path.join((process as any).resourcesPath, 'template.db');
    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, dbPath);
      log('Template database gekopieerd naar: ' + dbPath);
    } else {
      log('ERROR: Template database niet gevonden: ' + templatePath);
    }
  }

}

function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const standaloneDir = path.join((process as any).resourcesPath, 'standalone');
    const serverPath = path.join(standaloneDir, 'server.js');

    log('Standalone dir: ' + standaloneDir);
    log('Server path: ' + serverPath);
    log('Server exists: ' + fs.existsSync(serverPath));

    // Workaround: electron-builder filtert node_modules
    const modulesRenamed = path.join(standaloneDir, '_modules');
    const modulesTarget = path.join(standaloneDir, 'node_modules');
    if (fs.existsSync(modulesRenamed) && !fs.existsSync(modulesTarget)) {
      fs.renameSync(modulesRenamed, modulesTarget);
      log('_modules hernoemd naar node_modules');
    }

    const env = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      DATABASE_URL: `file:${getDbPath()}`,
      DATA_DIR: getDataDir(),
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
    };

    serverProcess = spawn(process.execPath, ['--no-warnings', serverPath], {
      env,
      cwd: standaloneDir,
      stdio: 'pipe',
    });

    serverProcess.stdout?.on('data', (data: Buffer) => {
      log('[server] ' + data.toString().trim());
    });

    serverProcess.stderr?.on('data', (data: Buffer) => {
      log('[server err] ' + data.toString().trim());
    });

    serverProcess.on('error', (err: Error) => {
      log('ERROR: Server kon niet starten: ' + err.message);
      reject(err);
    });

    serverProcess.on('exit', (code: number) => {
      log('Server afgesloten met code: ' + code);
    });

    // Poll totdat server bereikbaar is
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      const req = http.get(`http://127.0.0.1:${PORT}`, () => {
        clearInterval(poll);
        log('Server bereikbaar na ' + attempts + ' pogingen');
        resolve();
      });
      req.on('error', () => {
        if (attempts >= 30) {
          clearInterval(poll);
          log('ERROR: Server niet bereikbaar na 30 pogingen');
          reject(new Error('Server niet bereikbaar'));
        }
      });
      req.end();
    }, 500);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Cijferwerk',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  mainWindow.on('closed', () => { mainWindow = null; });
}

function initAutoUpdater() {
  autoUpdater.logger = {
    info: (msg: any) => log('[updater] ' + msg),
    warn: (msg: any) => log('[updater WARN] ' + msg),
    error: (msg: any) => log('[updater ERROR] ' + msg),
    debug: (msg: any) => log('[updater] ' + msg),
  } as any;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info: any) => {
    log('Update beschikbaar: v' + info.version);
  });

  autoUpdater.on('update-downloaded', (info: any) => {
    log('Update gedownload: v' + info.version);
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update beschikbaar',
        message: `Versie ${info.version} is gedownload en wordt geïnstalleerd bij het afsluiten.`,
        buttons: ['OK', 'Nu herstarten'],
      }).then((result: any) => {
        if (result.response === 1) autoUpdater.quitAndInstall();
      });
    }
  });

  autoUpdater.on('error', (err: Error) => {
    log('Update check fout: ' + err.message);
  });

  autoUpdater.checkForUpdates().catch((err: Error) => {
    log('Update check mislukt: ' + err.message);
  });
}

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.on('ready', async () => {
  try {
    log('App gestart, data dir: ' + getDataDir());
    ensureDataDir();
    await startServer();
    createWindow();
    initAutoUpdater();
  } catch (err: any) {
    log('FATAL: ' + err.message);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) { serverProcess.kill(); serverProcess = null; }
  app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) { serverProcess.kill(); serverProcess = null; }
});
