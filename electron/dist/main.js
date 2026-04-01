"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
const PORT = 4000;
let serverProcess = null;
let mainWindow = null;
function getDataDir() {
    return path.join(electron_1.app.getPath('appData'), 'Cijferwerk');
}
function getDbPath() {
    return path.join(getDataDir(), 'data', 'cijferwerk.db');
}
function log(msg) {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    try {
        fs.mkdirSync(getDataDir(), { recursive: true });
        fs.appendFileSync(path.join(getDataDir(), 'debug.log'), line);
    }
    catch { }
    console.log(msg);
}
function ensureDataDir() {
    const dataDir = getDataDir();
    const dbPath = getDbPath();
    fs.mkdirSync(path.join(dataDir, 'data', 'uploads'), { recursive: true });
    if (!fs.existsSync(dbPath)) {
        const templatePath = path.join(process.resourcesPath, 'template.db');
        if (fs.existsSync(templatePath)) {
            fs.copyFileSync(templatePath, dbPath);
            log('Template database gekopieerd naar: ' + dbPath);
        }
        else {
            log('ERROR: Template database niet gevonden: ' + templatePath);
        }
    }
}
function startServer() {
    return new Promise((resolve, reject) => {
        const standaloneDir = path.join(process.resourcesPath, 'standalone');
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
        serverProcess = (0, child_process_1.spawn)(process.execPath, ['--no-warnings', serverPath], {
            env,
            cwd: standaloneDir,
            stdio: 'pipe',
        });
        serverProcess.stdout?.on('data', (data) => {
            log('[server] ' + data.toString().trim());
        });
        serverProcess.stderr?.on('data', (data) => {
            log('[server err] ' + data.toString().trim());
        });
        serverProcess.on('error', (err) => {
            log('ERROR: Server kon niet starten: ' + err.message);
            reject(err);
        });
        serverProcess.on('exit', (code) => {
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
    mainWindow = new electron_1.BrowserWindow({
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
// Single instance lock
const gotLock = electron_1.app.requestSingleInstanceLock();
if (!gotLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
    });
}
electron_1.app.on('ready', async () => {
    try {
        log('App gestart, data dir: ' + getDataDir());
        ensureDataDir();
        await startServer();
        createWindow();
    }
    catch (err) {
        log('FATAL: ' + err.message);
        electron_1.app.quit();
    }
});
electron_1.app.on('window-all-closed', () => {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
    electron_1.app.quit();
});
electron_1.app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
});
