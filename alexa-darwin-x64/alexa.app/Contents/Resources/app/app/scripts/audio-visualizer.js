
function SiriWave9Curve(opt) {
  opt = opt || {};
  this.controller = opt.controller;
  this.color = opt.color;
  this.tick = 0;

  this.respawn();
}

SiriWave9Curve.prototype.respawn = function() {
  this.amplitude = 0.3 + Math.random() * 0.7;
  this.seed = Math.random();
  this.open_class = 2+(Math.random()*3)|0;
};

SiriWave9Curve.prototype.equation = function(i) {
  var p = this.tick;
  var y = -1 * Math.abs(Math.sin(p)) * this.controller.amplitude * this.amplitude * this.controller.MAX * Math.pow(1/(1+Math.pow(this.open_class*i,2)),2);
  if (Math.abs(y) < 0.001) {
    this.respawn();
  }
  return y;
};

SiriWave9Curve.prototype._draw = function(m) {
  this.tick += this.controller.speed * (1-0.5*Math.sin(this.seed*Math.PI));

  var ctx = this.controller.ctx;
  ctx.beginPath();

  var x_base = this.controller.width/2 + (-this.controller.width/4 + this.seed*(this.controller.width/2) );
  var y_base = this.controller.height/2;

  var x, y, x_init;

  var i = -3;
  while (i <= 3) {
    x = x_base + i * this.controller.width/4;
    y = y_base + (m * this.equation(i));
    x_init = x_init || x;
    ctx.lineTo(x, y);
    i += 0.01;
  }

  var h = Math.abs(this.equation(0));
  var gradient = ctx.createRadialGradient(x_base, y_base, h*1.15, x_base, y_base, h * 0.3 );
  gradient.addColorStop(0, 'rgba(' + this.color.join(',') + ',0.4)');
  gradient.addColorStop(1, 'rgba(' + this.color.join(',') + ',0.2)');

  ctx.fillStyle = gradient;

  ctx.lineTo(x_init, y_base);
  ctx.closePath();

  ctx.fill();
};

SiriWave9Curve.prototype.draw = function() {
  this._draw(-1);
  this._draw(1);
};


//////////////
// SiriWave //
//////////////

function SiriWave9(opt) {
  opt = opt || {};

  this.tick = 0;
  this.run = false;

  // UI vars

  this.ratio = opt.ratio || window.devicePixelRatio || 1;

  this.width = this.ratio * (opt.width || 320);
  this.height = this.ratio * (opt.height || 100);
  this.MAX = this.height/2;

  this.speed = 0.1;
  this.amplitude = opt.amplitude || 1;

  // Canvas

  this.canvas = document.createElement('canvas');
  this.canvas.width = this.width;
  this.canvas.height = this.height;
  this.canvas.style.width = (this.width / this.ratio) + 'px';
  this.canvas.style.height = (this.height / this.ratio) + 'px';

  this.container = opt.container || document.body;
  this.container.appendChild(this.canvas);

  this.ctx = this.canvas.getContext('2d');

  // Create curves

  this._setColors();

  if (opt.autostart) {
    this.start();
  }
}


SiriWave9.prototype._setColors = function() {
  this.curves = [];
  for (var i = 0; i < this.COLORS.length; i++) {
    var color = this.COLORS[i];
    for (var j = 0; j < (3 * Math.random())|0; j++) {
      this.curves.push(new SiriWave9Curve({
        controller: this,
        color: color
      }));
    }
  }
};

SiriWave9.prototype._clear = function() {
  this.ctx.globalCompositeOperation = 'destination-out';
  this.ctx.fillRect(0, 0, this.width, this.height);
  this.ctx.globalCompositeOperation = 'lighter';
};

SiriWave9.prototype._draw = function() {
  if (this.run === false) return;

  this._clear();
  for (var i = 0, len = this.curves.length; i < len; i++) {
    this.curves[i].draw();
  }

  requestAnimationFrame(this._draw.bind(this));
  //setTimeout(this._draw.bind(this), 100);
};


SiriWave9.prototype.start = function() {
  this.tick = 0;
  this.run = true;
  this._draw();
};

SiriWave9.prototype.stop = function() {
  this.tick = 0;
  this.run = false;
};

SiriWave9.prototype.setNoise = SiriWave9.prototype.setAmplitude = function(v) {
  const observedMax = -200;
  this.amplitude =  1 - (Math.min(Math.min.apply(null, v), 1) / observedMax) + 0.3;
};

var colors = [
  // Siri colors
  //[32,133,252],
  //[94,252,169],
  //[253,71,103]

  [0,193,224],
  [0,108,168],
  [86,77,228]
];

SiriWave9.prototype.COLORS = colors;

function AudioVisualizer(visualizationContainer) {
  /*
   * Setup audio API
   */
  this.audioContext = new AudioContext();
  // Setup analyzer
  this.analyser = this.audioContext.createAnalyser();
  this.analyser.fftSize = 2048;
  // Setup buffer
  const bufferLength = this.analyser.frequencyBinCount;
  this.dataArray = new Float32Array(bufferLength);
  /*
   * Setup visualization
   */
  this.visualization = new SiriWave9({
    container: visualizationContainer,
    width: window.innerWidth,
    height: window.innerHeight,
    speed: 0.09,
    amplitude: 0.1
  });
}


AudioVisualizer.prototype.start = function() {
    this.visualization.start();
    // Start getting audio data
    requestAnimationFrame(function() {
      this._getLatestAudioData();
    }.bind(this));
};

AudioVisualizer.prototype.setSource = function(stream) {
  this.source = this.audioContext.createMediaStreamSource(stream);
  this.source.connect(this.analyser);
};

AudioVisualizer.prototype._getLatestAudioData = function() {
  this.analyser.getFloatFrequencyData(this.dataArray);
  this.visualization.setAmplitude(this.dataArray);
  requestAnimationFrame(function() {
    this._getLatestAudioData();
  }.bind(this));
};
