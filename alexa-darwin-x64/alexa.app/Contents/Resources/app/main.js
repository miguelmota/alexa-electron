'use strict';

const menubar = require('menubar');
const electron = require('electron');
const globalShortcut = electron.globalShortcut;

const mb = menubar({
  icon: __dirname + '/IconTemplate.png',
  dir: __dirname,
  index: 'file://' + __dirname + '/app/index.html',
  width: 600,
  height: 200,
  'window-position': 'bottomCenter',
  'always-on-top': false,
  preloadWindow: true,
  'node-integration': true,
  frame: false,
  transparent: true,
  //center: true,
  darkTheme: true
});

mb.on('ready', function() {
  var isVisible = false;

  const SHORTCUT_KEY = 'CommandOrControl+Shift+A';

 // Register a 'ctrl+x' shortcut listener.
  var ret = globalShortcut.register(SHORTCUT_KEY, function() {
    console.log('trigger is pressed');
    isVisible = !isVisible;
    mb[isVisible ? 'hideWindow' : 'showWindow']();
    mb.window.webContents.send('window-open');
  });

  if (!ret) {
    console.log('registration failed');
  }

  // Check whether a shortcut is registered.
  console.log(globalShortcut.isRegistered(SHORTCUT_KEY));
  /*
  mb.app.on('will-quit', function() {
  // Unregister a shortcut.
  globalShortcut.unregister('ctrl+x');

  // Unregister all shortcuts.
  globalShortcut.unregisterAll();
});
*/
});

module.export = mb;
