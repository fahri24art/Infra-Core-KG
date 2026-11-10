const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();
let mainWindow = null;
let tray = null;
let agentRunning = false;

// Initialize default config
if (!store.has('serverUrl')) {
    store.set('serverUrl', 'http://localhost:5000');
}
if (!store.has('autoStart')) {
    store.set('autoStart', true);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 600,
        height: 500,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        resizable: false,
        show: false
    });

    mainWindow.loadFile('index.html');
    
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function createTray() {
    tray = new Tray(nativeImage.createEmpty());
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open Configuration',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                } else {
                    createWindow();
                }
            }
        },
        {
            label: agentRunning ? 'Stop Agent' : 'Start Agent',
            click: () => {
                if (agentRunning) {
                    stopAgent();
                } else {
                    startAgent();
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Auto-start on Boot',
            type: 'checkbox',
            checked: store.get('autoStart'),
            click: () => {
                const current = store.get('autoStart');
                store.set('autoStart', !current);
                app.setLoginItemSettings({
                    openAtLogin: !current,
                    openAsHidden: true
                });
            }
        },
        { type: 'separator' },
        {
            label: 'Exit',
            click: () => {
                app.quit();
            }
        }
    ]);
    
    tray.setToolTip('TCF Remote Agent');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
        if (mainWindow) {
            mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        } else {
            createWindow();
        }
    });
}

function startAgent() {
    agentRunning = true;
    // Send to renderer to start agent logic
    if (mainWindow) {
        mainWindow.webContents.send('agent-start');
    }
    updateTrayMenu();
}

function stopAgent() {
    agentRunning = false;
    if (mainWindow) {
        mainWindow.webContents.send('agent-stop');
    }
    updateTrayMenu();
}

function updateTrayMenu() {
    if (tray) {
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Open Configuration',
                click: () => {
                    if (mainWindow) {
                        mainWindow.show();
                        mainWindow.focus();
                    } else {
                        createWindow();
                    }
                }
            },
            {
                label: agentRunning ? 'Stop Agent' : 'Start Agent',
                click: () => {
                    if (agentRunning) {
                        stopAgent();
                    } else {
                        startAgent();
                    }
                }
            },
            { type: 'separator' },
            {
                label: 'Auto-start on Boot',
                type: 'checkbox',
                checked: store.get('autoStart'),
                click: () => {
                    const current = store.get('autoStart');
                    store.set('autoStart', !current);
                    app.setLoginItemSettings({
                        openAtLogin: !current,
                        openAsHidden: true
                    });
                }
            },
            { type: 'separator' },
            {
                label: 'Exit',
                click: () => {
                    app.quit();
                }
            }
        ]);
        tray.setContextMenu(contextMenu);
    }
}

// IPC handlers
ipcMain.handle('get-config', () => {
    return {
        serverUrl: store.get('serverUrl'),
        autoStart: store.get('autoStart')
    };
});

ipcMain.handle('save-config', (event, config) => {
    store.set('serverUrl', config.serverUrl);
    store.set('autoStart', config.autoStart);
    
    // Update auto-start setting
    app.setLoginItemSettings({
        openAtLogin: config.autoStart,
        openAsHidden: true
    });
    
    return { success: true };
});

ipcMain.handle('get-agent-status', () => {
    return agentRunning;
});

ipcMain.on('agent-status-changed', (event, status) => {
    agentRunning = status;
    updateTrayMenu();
});

app.whenReady().then(() => {
    createWindow();
    createTray();
    
    // Set auto-start based on config
    app.setLoginItemSettings({
        openAtLogin: store.get('autoStart'),
        openAsHidden: true
    });
    
    // Start agent automatically if configured
    if (store.get('autoStart')) {
        setTimeout(startAgent, 2000);
    }
});

app.on('window-all-closed', () => {
    // Don't quit on macOS when all windows closed
    if (process.platform !== 'darwin') {
        // Keep app running in background
    }
});

app.on('before-quit', () => {
    if (tray) {
        tray.destroy();
    }
});
