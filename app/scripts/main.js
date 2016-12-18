(function() {
  'use strict';

  const electron = require('electron');
  const ipc = electron.ipcRenderer;
  const BrowserWindow = electron.remote.BrowserWindow;
  const xhr = require('xhr');

  const KEYS = {
    SPACEBAR: 32,
    ESC: 27
  };

  ipc.on('window-open', function() {
    console.log('test');
  });

  const CONFIG = {
    apiUrl: 'http://127.0.0.1:3463'
  };
  /*
   var raw_code = /code=([^&]*)/.exec(url) || null;
    var code = (raw_code && raw_code.length > 1) ? raw_code[1] : null;
    var error = /\?error=(.+)$/.exec(url);
   */

  const apiUrl = CONFIG.apiUrl;
  const websocketHost = null;

  var app = {
    apiUrl: CONFIG.apiUrl,

    auth: {
      isAuthenticatedStatus: false,

      isAuthenticated: function(params) {
        const deferred = Promise.defer();
        var url = app.apiUrl + '/auth/check';

        if (params) {
          url += '?' + serialize(params);
        }

        xhr({
          method: 'GET',
          url: url,
          responseType: 'json'
        }, function(error, response, body) {
          if (body.isAuthenticated) {
            app.auth.isAuthenticatedStatus = true;
            return deferred.resolve(body);
          }

          app.auth.isAuthenticatedStatus = false;
          return deferred.reject(body);
        }.bind(this));

        return deferred.promise;
      },

      authenticate: function() {
        const deferred = Promise.defer();
        const url = app.apiUrl + '/auth';

        xhr({
          method: 'GET',
          url: url,
          responseType: 'json'
        }, function(error, response, body) {
          var authUrl = body.authUrl;
          if (authUrl) {
            var authWindow = new BrowserWindow({
                width: 800,
                height: 600,
                show: false,
                'webPreferences':{
                  'nodeIntegration': false,
                  'webSecurity': false,
                  allowDisplayingInsecureContent: true,
                  allowRunningInsecureContent: true
                }
            });
            authUrl = authUrl.replace('127.0.0.1', 'localhost');
            authWindow.loadURL(authUrl);
            authWindow.show();

            var lastUrl = null;

            authWindow.webContents.on('did-get-redirect-request', function (event, oldUrl, newUrl) {
              setTimeout(function() {
                var currentUrl = authWindow.getURL();
                if (currentUrl.indexOf('code=') > -1) {
                  lastUrl = currentUrl;
                }
              }, 10);
            });

            authWindow.on('close', function() {
                console.log('Auth window closed.');

                var a = document.createElement('a');
                a.href = lastUrl;
                var params = a.search.substr(1).split('&').reduce(function(acc, part) {
                  var split = part.split('=');

                  acc[split[0]] = split[1];
                  return acc;
                }, {});

                app.auth.isAuthenticated({
                  code: params.code,
                  state: params.state
                }).then(function(response) {
                  console.log('Authenticated: true', response);
                  $(listenButton).show();
                }).catch(function(response) {
                  console.log('Authenticated: false', response);
                });
            });

            authWindow.on('closed', function() {
              authWindow = null;
            });

            return deferred.resolve(body);
          } else if (body.isAuthenticated) {
            app.auth.isAuthenticatedStatus = true;
            return deferred.resolve(body);
          }

          return deferred.reject(body);
        });

        return deferred.promise;
      }
    },

    websocket: {
      host: websocketHost || (window.document.location.host.replace(/:.*/, '') || '127.0.0.1'),

      socket: null,

      init: function() {
        const deferred = Promise.defer();
        app.websocket.socket = new WebSocket('ws://' + app.websocket.host + ':8080');
        app.websocket.socket.binaryType = 'arraybuffer';
        app.websocket.socket.onmessage = app.websocket.onMessage;

        deferred.resolve();

        return deferred.promise;
      },

      send: function(data) {
        if (typeof data === 'object') {
          data = JSON.stringify(data);
        }

        console.log('Sending data');

        app.websocket.socket.send(data);
      },

      onMessage: function(event) {
        /*
        audioVisualizer.visualization.COLORS = [
          [110, 0, 224],
          [168, 0, 168],
          [144, 77, 228]
        ];
       */

        //audioVisualizer.visualization._setColors();

        const data = event.data;
        const isArrayBuffer = Object.prototype.toString.call(data) === '[object ArrayBuffer]';
        console.log('Got data:', event, data, data.byteLength);

        loader.hide();

        if (!isArrayBuffer) {
          var response = {};

          try {
            response = JSON.parse(data);
          } catch(error) {
            console.log(error);
          }

          var headers = response.headers;
          var body = response.body;

          if (!(headers instanceof Object)) {
            headers = {};
          }

          if (headers['Content-Type'] === 'application/json') {
            try {
              body = JSON.parse(body);
            } catch(error) {
              console.log(error);
            }

            console.log('body', body);

            /*
             * directive.
             * { namespace: 'AudioPlayer',
             *   name: 'clearQueue',
             *     payload: { clearBehavior: 'CLEAR_ENQUEUED' } }
             **/

            var directives = _.get(body, ['messageBody', 'directives'], []);

            var playing = false;

            for (var i = 0; i < directives.length; i++) {
              var directive = directives[i];
              if (_.get(directive, 'name') === 'speak') {
                if (!playing) {
                  setTimeout(function() {
                    play(_.get(directive, ['payload', 'audioContent'], '').replace('cid:', ''));
                    directives.splice(i, 1);
                  }, 200);
                }
              }

              if (_.get(directive, 'name') === 'play' && _.get(directive, 'namespace') === 'AudioPlayer') {
                var streams = _.get(directive, ['payload', 'audioItem', 'streams']);

                if (_.size(streams)) {
                  streams.forEach(function(stream) {
                    if (stream.streamMp3Urls) {
                      mp3Queue = stream.streamMp3Urls;
                      audioPlayerPlay();
                    }
                  });
                }
              }
            }
          } else {
            responseQueue.push(headers);
          }
        }

        if (isArrayBuffer) {
          audioBufferQueue.push(data);
        } else {

        }
      }
    }
  };

  const listenButton = document.querySelector('.listen-button');
  const authenticateButton = document.querySelector('.authenticate-button');
  const audioContext = new AudioContext();
  const visualiztionContainer = document.querySelector('.audio-vis-container');
  const micButton = document.querySelector('.mic-button');
  const audioVisualizer = new AudioVisualizer(visualiztionContainer);

  $(authenticateButton).on('click', function(event) {
    app.auth.authenticate().then(function(response) {
      if (response.authUrl) {
        console.log('User must authenticate.');
      } else {
        console.log('Authenticated: true', response);
        $(authenticateButton).hide();
        $(listenButton).show();
      }
    }).catch(function(response) {
      console.log('Authenticated: false', response);
    });
  });

  app.websocket.init().then(function() {
    app.auth.isAuthenticated().then(function(response) {
      console.log('Authenticated: true');
      $(listenButton).show();
      $(authenticateButton).hide();
    }).catch(function(response) {
      console.log('Authenticated: false');
      $(authenticateButton).show();
    });
  });

  const stateCounter = (function() {
    var state = 0;

    return {
      incr: function() {
        state += 1;
      },
      reset: function() {
        state = 0;
      },
      count: function() {
        return state;
      }
    };
  })();

  const loader = {
    hide: _.throttle(function() {
      var $loader = $('.loader');
      $loader.removeClass('animated fadeIn').addClass('animated fadeOut');
      loader.isLoading = false;
    }, 10),
    show: _.throttle(function() {
      var $loader = $('.loader');
      $loader.removeClass('animated fadeOut').addClass('animated fadeIn');
      loader.isLoading = true;
    }, 10),
    isLoading: false
  };

  loader.hide();

  const dialog = {
    hide: _.throttle(function() {
      $(listenButton).removeClass('animated fadeIn').addClass('animated fadeOut');
    }, 10),
    show: _.throttle(function() {
      $(listenButton).removeClass('animated fadeOut').addClass('animated fadeIn');
    }, 10)
  }

    var isListening = false;
  const UI = (function() {
    const $visualizationContainer = $(visualiztionContainer);
    const $micButton = $(micButton);

    return {
      toggleListening: function() {
        // TODO - add only one class
        $visualizationContainer.toggleClass('listening');
        $micButton.toggleClass('listening');
        isListening = !isListening;
      },

      startListening: function() {
        if (!app.auth.isAuthenticatedStatus) {
          return false;
        }

        if (!isListening) {
          isListening = true;

          $visualizationContainer.addClass('listening');
          $micButton.addClass('listening');
        }
        dialog.hide();
        loader.hide();
      },

      stopListening: function() {
        if (isListening) {
          isListening = false;

          $visualizationContainer.removeClass('listening');
          $micButton.removeClass('listening');

          dialog.show();
        }
      },

      isListening: function() {
        return isListening;
      }
    };
  })();

  const audioRecorder = (function() {
    var recorder;

    function blobToBase64(blob, cb) {
      var reader = new FileReader();
      reader.onload = function() {
        var dataUrl = reader.result;
        var base64 = dataUrl.split(',')[1];
        cb(base64);
      };
      reader.readAsDataURL(blob);
    }

    function wavExportCallback(data) {
      console.log('WAV Export:', data);

      blobToBase64(data, function(base64) {
        loader.show();
        dialog.hide();
        app.websocket.send({
          state: stateCounter.count(),
          data: base64
        });
      });
    }

    return {
      startRecording: function() {
        if (!recorder) {
          return false;
        }
        if (recorder.isRecording) {
          return false;
        }

        recorder.record();
        recorder.isRecording = true;
      },

      stopRecording: function() {
        if (!recorder) {
          return false;
        }

        recorder.stop();
        recorder.exportWAV(wavExportCallback);
        recorder.clear();
        recorder.isRecording = false;
      },

      connect: function(mediaStream) {
        recorder = new Recorder(mediaStream, {
          numChannels: 1
        });
      },

      _getRecorder: function() {
        return recorder;
      }
    };
  })();

  const keyboardTimeoutManager = (function() {
    const KEY_DOWN_TIMEOUT = 350;
    var keyDownTimeout;

    return {
      clearTimeout: function() {
        if (keyDownTimeout) {
          window.clearTimeout(keyDownTimeout);
        }

        keyDownTimeout = null;
      },

      getKeyDownTimeout: function() {
        return keyDownTimeout;
      },

      setKeyDownTimeout: function(timeout) {
        keyDownTimeout = timeout;
        return keyDownTimeout;
      },

      KEY_DOWN_TIMEOUT: KEY_DOWN_TIMEOUT
    };
  })();

  window.addEventListener('keydown', function(e) {
    if (!app.auth.isAuthenticatedStatus) {
      return false;
    }

    if (e.keyCode === KEYS.SPACEBAR) {
      if (!UI.isListening()) {
        audioRecorder.startRecording();
        /*
        audioVisualizer.visualization.COLORS = [
          [0,193,224],
          [0,108,168],
          [86,77,228]
        ];
       */

        //audioVisualizer.visualization._setColors();
      }

      if (!keyboardTimeoutManager.getKeyDownTimeout()) {
        var timeout = setTimeout(function() {
          keyboardTimeoutManager.clearTimeout();
          stateCounter.incr();
          UI.startListening();
        }, keyboardTimeoutManager.KEY_DOWN_TIMEOUT);

        keyboardTimeoutManager.setKeyDownTimeout(timeout);
      }
    }
  }, false);

  document.addEventListener('keyup', function(e) {
    if (!app.auth.isAuthenticatedStatus) {
      return false;
    }

    if (e.keyCode === KEYS.SPACEBAR) {
      keyboardTimeoutManager.clearTimeout();
      audioRecorder.stopRecording();
      UI.stopListening();
    }
    if (e.keyCode === KEYS.ESC) {
      keyboardTimeoutManager.clearTimeout();
      UI.stopListening();
      stateCounter.reset();
    }
  }, false);

  audioVisualizer.start();

  // Set correct getUserMedia
  navigator.getUserMedia = navigator.getUserMedia ||
                           navigator.webkitGetUserMedia ||
                           navigator.mozGetUserMedia;

  // set correct AudioContext
  window.AudioContext = window.AudioContext || window.webkitAudioContext;

  // Get audio stream from microphone
  navigator.getUserMedia({ audio: true }, (stream) => {
      audioVisualizer.setSource(stream);
      audioRecorder.connect(audioContext.createMediaStreamSource(stream));
    }, function (error) {
      console.error(error);
    });

  var audioBufferQueue = [];
  var responseQueue = [];
  var directivesQueue = [];
  var mp3Queue = [];
  var audioPlayer = document.querySelector('.audio-player');

  var source = null;

  function play(identifier) {
    var data = responseQueue.reduce(function(acc, o, i) {
      var contentId = _.get(o, 'Content-ID', '');
      if (contentId && contentId.indexOf(identifier) > -1) {
        responseQueue.splice(i, 1);
        return audioBufferQueue.splice(i, 1)[0];
      }
      return acc;
    }, null);

    if (data) {
      audioContext.decodeAudioData(data, function(buffer) {
        console.log('Decoded buffer:', buffer);

        if (source) {
          source.stop();
        }

        source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);

        UI.startListening();

        source.onended = function() {
          UI.stopListening();
          sourceEndHandler(source);
        };
      }, function(err) {
        stateCounter.reset();
        console.error('error', err);
      });
    }
  }

  function audioPlayerPlay() {
    if (mp3Queue.length) {
      audioPlayer.src = mp3Queue.shift();
      audioPlayer.play();
    }
  }

  function sourceEndHandler(source) {

  }

  function serialize(obj, prefix) {
    var s = function(obj, prefix) {
      var str = [];
      for(var p in obj) {
        var k = prefix ? prefix + '[' + p + ']' : p, v = obj[p];
        if (v !== undefined && v !== null) {
          var set;
          if (_.isObject(v)) {
            set = s(v, k);
            str.push(set);
          } else if (Array.isArray(v)) {
            v.forEach(function(n) {
              set = encodeURIComponent(k) + '=' + encodeURIComponent(n);
              str.push(set);
            });
          } else {
            set = encodeURIComponent(k) + '=' + encodeURIComponent(v);
            str.push(set);
          }
        }
      }
      return str.join('&');
    };
    return s(obj, prefix);
  }
})();
