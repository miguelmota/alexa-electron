'use strict';

var packager = require('electron-packager');

var opts = {
  dir: './',
  name: 'alexa',
  platform: 'darwin',
  arch: 'x64',
  version: '0.36.1',
  icon: './designAssets/alexa.icns',
  overwrite: true
};

packager(opts, function done(err, appPath) {
  if (err) {
    console.error(err);
  }
  console.log(appPath);
});
