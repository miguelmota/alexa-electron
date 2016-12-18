'use strict';

const app = require('app');
const BrowserWindow = require('browser-window');
const menubar = require('menubar');
const electron = require('electron');
const ipc = electron.ipcMain;
const globalShortcut = electron.globalShortcut;

const DEBUG_MODE = false;

var mainWindow = null;

app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});



app.on('ready', function() {
　　var screen = require('screen');
　　var size = screen.getPrimaryDisplay().size;
  mainWindow = new BrowserWindow({
  　width: size.width,
　　height: size.height,
    fullscreen: false,
    kiosk: false,
    show: true,
    resizable: true,
    'window-position': 'center',
    'always-on-top': false,
    preloadWindow: true,
    'node-integration': true,
    frame: true,
    transparent: false,
    center: true,
    darkTheme: true,
    'auto-hide-menu-bar': false
  });

  mainWindow.loadURL('file://' + __dirname + '/app/index.html');

  if (DEBUG_MODE) {
    mainWindow.openDevTools();
  }

  mainWindow.on('closed', function() {
    mainWindow = null;
  });

  ipc.on('window-open', function() {
    mainWindow.show();
  });

  ipc.on('quit', function() {
    app.quit();
  });

  const SHORTCUT_KEY = 'CommandOrControl+Shift+A';

  const shortcutKeyReg = globalShortcut.register(SHORTCUT_KEY, function() {
    console.log('Shortcut trigger pressed');

    mainWindow[mainWindow.isVisible() ? 'hide' : 'show']();
    mainWindow.webContents.send('window-open');
  });

  if (!shortcutKeyReg) {
    console.error('Shortcut registration failed.');
  }

  if (!globalShortcut.isRegistered(SHORTCUT_KEY)) {
    console.error('Shortcut not registered.');
  }
});

const mb = menubar({
  icon: __dirname + '/IconTemplate.png',
  dir: __dirname,
  index: 'file://' + __dirname + '/app/menubar.html',
  width: 300,
  height: 200,
  'always-on-top': false,
  preloadWindow: true,
  'node-integration': true,
  frame: false,
  transparent: true,
  darkTheme: true
});

mb.on('ready', function() {
  mb.app.on('will-quit', function() {
    globalShortcut.unregisterAll();
  });
});

module.export = app;
