(function() {
  'use strict';

  const electron = require('electron');
  const ipc = electron.ipcRenderer;

  $(document).on('click', '[clickAction]', clickActionHandler);

  function clickActionHandler(event) {
    event.preventDefault();
    const action = $(event.target).attr('clickAction');
    const handler = handlers[action];

    if (typeof handler === 'function') {
      handler();
    } else {
      console.error('No handler for action:', action);
    }
  }



  const handlers = {
    about: function() {
      alert('Created by Miguel Mota\n\nSource code\ngithub.com/miguelmota/alexa-electron');
    },
    logOut: function() {
      console.log('Logging out');
    },
    openWindow: function() {
      console.log('Opening window');
      ipc.send('window-open');
    },
    quit: function() {
      console.log('Quitting');
      ipc.send('quit');
    }
  };
})();
