var context;
var pads;

const c_grey = 0;
const c_red = 1;
const c_orange = 2;
const c_yellow = 3;
const c_green = 4;
const c_blue = 5;

// (this would be much cleaner as a single object but no time)

var COLORS = [
  [119, 119, 119],
  [206, 24, 54],
  [248, 89, 49],
  [237, 185, 46],
  [163, 169, 72],
  [0, 153, 137],
];

var soundURLs = [
  "",
  "audio/red.wav",
  "audio/orange.wav",
  "audio/yellow.wav",
  "audio/green.wav",
  "audio/blue.wav"
];

var soundBuffers = [null, null, null, null, null, null];

// Selection
var color = c_red;

// Canvas
var QUALITY = 2;
var WIDTH = Math.floor($(window).innerWidth() / QUALITY);
var HEIGHT = Math.floor($(window).innerHeight() / QUALITY); 
var topleftx, toplefty, padwidth;

var meter;

// Ripples
var bcontext, rcontext;
var image, data;
var buffer1, buffer2, tempbuffer;

// Time
var bpm = 120;

var container, bcanvas, rcanvas;

// Init
$(document).ready(function() {

  meter = new FPSMeter();

  initCanvases();

  rcontext.fillStyle = "#FFFFFF";
  rcontext.fillRect (0, 0, WIDTH, HEIGHT);
  image = rcontext.getImageData(0, 0, WIDTH, HEIGHT);
  data = image.data;
  
  buffer1 = [];
  buffer2 = [];
  SIZE = WIDTH * HEIGHT;
  for (var i = 0; i < SIZE; i++) {
    buffer1[i] = [0, 0, 0];
    buffer2[i] = [0, 0, 0];
  }

  pads = [];
  for (var x = 0; x < 64; x++) {
    pads[x] = {
      sound: null,
      active: [0, 0, 0, 0, 0, 0],
      sound_offset: x % 8
    };
  }

  drawGrid();

  bcanvas.addEventListener('click', checkClickBox, false);

  // AudioContext
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    context = new AudioContext();
  } catch(e) {
    alert('Web Audio API is not supported in this browser');
  }
  for (var x = 1; x < 6; x++) {
    loadSound(x, soundURLs[x]);
  }

  navigator.requestMIDIAccess().then(success, failure);
  setInterval(loop, 1000 / 60);

});

function initCanvases() {
  container = document.getElementById('container');

  rcanvas = document.createElement('canvas');
  rcanvas.id = "rcanvas";
  rcanvas.width = WIDTH;
  rcanvas.height = HEIGHT;
  rcanvas.style.width = "99vw";
  rcanvas.style.height = "99vh";
  container.appendChild(rcanvas);

  var bwidth = $(window).innerWidth();
  var bheight = $(window).innerHeight();
  bcanvas = document.createElement('canvas');
  bcanvas.id = "bcanvas";
  bcanvas.width = bwidth;
  bcanvas.height = bheight;
  bcanvas.style.width = "99vw";
  bcanvas.style.height = "99vh";
  container.appendChild(bcanvas);
  bcontext = bcanvas.getContext("2d");
  rcontext = rcanvas.getContext("2d");

  var mindim = Math.min(bwidth, bheight) - 200;
  topleftx = Math.floor((bwidth - mindim) / 2);
  toplefty = Math.floor((bheight - mindim) / 2);
  padwidth = ~~(mindim / 17 + 0.5);
}

var frame = 0;

function loop() {

  if (frame % 30 == 0) {
    if (frame == (30 * 8)) {
      frame = 0;
    }
    playbeat(frame / 30);
  }
  frame++;

  var pixel = [0, 0, 0];
  var iMax = (WIDTH * HEIGHT) - WIDTH;

  for (var i = WIDTH; i < iMax; i++) {
    
    var up = buffer1[i - WIDTH];
    var left = buffer1[i - 1];
    var down = buffer1[i + WIDTH];
    var right = buffer1[i + 1];

    
    var thresh = 1;
    if (up[0] < thresh && down[1] < thresh && left[1] < thresh && right[2] < thresh) {
      continue;
    }
    
    var overflow = 0;
    // R, G, B
    for (var j = 0; j < 3; j++) {
      pixel[j] = ((up[j] + left[j] + down[j] + right[j]) / 2.01) - buffer2[i][j];
      /*
      if (pixel[j] > 255) {
        overflow = Math.max(overflow, pixel[j] - 255);
      }*/
      pixel[j] = pixel[j] < 0 ? 0 : pixel[j] //> 255 ? pixel[j] -30 : pixel[j];
      buffer2[i][j] = pixel[j];
      pixel[j] = 255 - pixel[j];
    }
    /*
    if (overflow != 0) {
      pixel[0] += overflow;
      pixel[1] += overflow;
      pixel[2] += overflow; 
    }
    */

    var idx = i * 4;
    data[idx] = pixel[0];
    data[idx + 1] = pixel[1];
    data[idx + 2] = pixel[2];
    data[idx + 3] = 255;
  }
  tempbuffer = buffer1;
  buffer1 = buffer2;
  buffer2 = tempbuffer;

  rcontext.putImageData(image, 0, 0);
  meter.tick();
}

// ON BEAT *****************************************

function playbeat(beat) {
  for (var i = beat * 8; i < beat * 8 + 8; i++) {
    drop(i);
    for (var j = 1; j < 6; j++) {
      if (pads[i].active[j]) {
        playSound(j, i % 8);
      }
    }
  }
}

// DRAWING *****************************************

function drawGrid() {
  var cursorx = topleftx;
  var cursory = toplefty;

  var cactive = COLORS[color];
  var filled = 'rgb(' + cactive[0] + ',' + cactive[1] + ',' + cactive[2] + ')';

  var idx = 0;

  // Color selectors
  for (var j = -2; j < 6; j++) {
    bcontext.clearRect(cursorx, cursory, padwidth, padwidth);
    bcontext.beginPath();
    bcontext.arc(cursorx + padwidth/2, cursory + padwidth/2, padwidth/3, 0, 2*Math.PI);
    if (j == color) {
      bcontext.fillStyle = filled;
      bcontext.fill();
    } else {
      var col = j > 0 ? COLORS[j] : COLORS[0];
      var scolor = 'rgb(' + col[0] + ',' + col[1] + ',' + col[2] + ')';
      bcontext.strokeStyle = scolor;
      bcontext.lineWidth = -10;
      bcontext.stroke();
    }
    bcontext.closePath();
    cursorx += padwidth * 2;
  }
  
  // Pads
  cursory += padwidth * 2;
  cursorx = topleftx;
  
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      bcontext.clearRect(cursorx, cursory, padwidth, padwidth);
      if (pads[idx].active[color]) {
        bcontext.fillStyle = filled;
      } else {
        bcontext.fillStyle = '#999';
      }
      bcontext.beginPath();
      bcontext.arc(cursorx + padwidth/2, cursory + padwidth/2, padwidth/3, 0, 2*Math.PI);
      bcontext.fill();
      bcontext.closePath();

      cursory += padwidth * 2;
      idx++;
    }
    cursorx += padwidth * 2;
    cursory = toplefty + padwidth * 2;
  }
}

function drop(i) {
  var cx = topleftx + (padwidth/2) + 2 * padwidth * Math.floor(i/8.0); 
  var cy = toplefty + 2*padwidth + (padwidth/2) + 2 * padwidth * (i % 8);
  var dropidx = Math.floor(cx / QUALITY) + (Math.floor(cy / QUALITY) * WIDTH);
  
  // Get color
  var cdrop = [0, 0, 0];
  var ccount = 0;
  for (var j = 1; j < 6; j++) {
    if (pads[i].active[j] != 0) {
      cdrop[0] += COLORS[j][0];
      cdrop[1] += COLORS[j][1];
      cdrop[2] += COLORS[j][2];
      ccount++;
    }
  }
  if (ccount == 0) return;


  var spacing = 1;
  var dropsize = padwidth / 7.0;
  var dsint = Math.floor(dropsize);
  for (var x = -dsint; x < dsint+1; x+=spacing) {
    for (var y = -dsint; y < dsint+1; y+=spacing) {
      if (x*x + y*y > dsint*dsint) continue;
      var fade = (x*x + y*y) / (6.0 * dsint*dsint);
      
      for (var rgb = 0; rgb < 3; rgb++) {
        var col = cdrop[rgb] / ccount;
        col += (255.0-col) * fade;
        buffer1[dropidx + x + y*WIDTH][rgb] = 255 - col;
      }
    }
  }
}

function resetAll() {
  for (var i = 0; i < 64; i++) {
    for (var j = 1; j < 6; j++) {
      pads[i].active[j] = 0;
    }
  }
}

// CLICK DETECTION *********************************

function checkClickBox(e) {
  var ex = ~~(e.pageX + 0.5);
  var ey = ~~(e.pageY + 0.5);
  
  if (ex < topleftx || ex > topleftx + 15*padwidth || 
      ey < toplefty || ey > toplefty + 17*padwidth) {
    return;
  }

  
  // Controls
  if (ey > toplefty && ey < toplefty + padwidth) {
    var cursorx = topleftx + padwidth * 2 * 2;
    for (var x = 0; x < 6; x++) { 
      if (ex > cursorx && ex < cursorx + padwidth) {
        if (x == 0) {
          resetAll();
          drawGrid();
          return;
        }
        color = x;
        drawGrid();
        return;
      }
      cursorx += 2 * padwidth;
    }
    return;
  }

  var cursorx = topleftx;
  var cursory = toplefty + padwidth * 2;

  var idx;
  for (var x = 0; x < 8; x++) {
    idx = (x * 8) - 1;
    if (ex < cursorx) return;
    for (var y = 0; y < 8; y++) {
      idx++;
      if (ey < cursory) break;
      if (ex >= cursorx && ex <= cursorx + padwidth && 
          ey >= cursory && ey <= cursory + padwidth) {
        padClicked(idx);
        return;
      }
      cursory += padwidth * 2;
    }
    cursorx += padwidth * 2;
    cursory = toplefty + padwidth * 2;
  }

}

function padClicked(i) {
  if (pads[i].active[color] == 1) {
    pads[i].active[color] = 0;
  } else {
    pads[i].active[color] = 1;
    //drop(i);
  }
  drawGrid();
}


// SOUND HANDLING **********************************

function loadSound(i, url) {
  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';

  request.onload = function() {
    context.decodeAudioData(
      request.response, 
      function(buffer) { soundBuffers[i] = buffer; },
      onError
    )
  }

  console.log("Loading: " + url);
  request.send();
}

function onError() {
  alert('Something went wrong');
}

function playSound(i, starttime) {
  if (!soundBuffers[i]) return;
  var source = context.createBufferSource();
  source.buffer = soundBuffers[i];
  source.connect(context.destination);
  source.start(0, starttime * 2 + 0.005, 1);
}



// MIDI *********************************************

var midi = null;
var inputs = null;
var outputs = null;
var input = null;
var output = null;
var select = false;
var prevMode;

function handleMIDIMessage(ev) {
  
  // Downpress
  
  var trig = parseInt(ev.data[1].toString());

  if (trig == 120) {
    select = true;
  }

  // Transposing the trigger number
  if (0 <= trig && trig <= 7) {
    trig += 56;
  } else if (16 <= trig && trig <= 23) {
    trig += 32;
  } else if (32 <= trig && trig <= 39) {
    trig += 8;
  } else if (48 <= trig && trig <= 55) {
    trig -= 16;
  } else if (64 <= trig && trig <= 71) {
    trig -= 40;
  } else if (80 <= trig && trig <= 87) {
    trig -= 64;
  } else if (96 <= trig && trig <= 103) {
    trig -= 88;
  } else if (112 <= trig && trig <= 119) {
    trig -= 112;
  } else {
    trig = -1;
  }
  
  if (ev.data[2].toString(16) == "7f") {
    // Actually play or display info
    if (select) {
      displayInfo(trig);
    } else {
      playSound(trig, 0);
    }

    $('#' + trig).css({'border': '2px solid #FF9900'});
    $('#' + trig).css({'background-color': '#FF9900'});
    output.send(ev.data);
  } else {
    revertBorder($('#' + trig));

    output.send(ev.data);
    if (parseInt(ev.data[1].toString()) == 120) {
      select = false;
    }
  }
}

function revertBorder(i) {
  if (i.attr('id') == beingEdited) {
    i.css({'border': '2px solid #FF9900'});
  } else {
    i.css({'border': '2px solid #DDD'});
  }
  i.css("background-color", "white");
}

function success(midiAccess) {
  midi = midiAccess;
  inputs = midi.inputs;
  if (inputs.size > 0) {
  	var inputsIter = inputs.values();	// Iterator
  	input = inputsIter.next().value;    // LAUNCHPAD
    input.addEventListener("midimessage", handleMIDIMessage);
    outputs = midi.outputs;
    if (outputs.size) {
      var outputsIter = outputs.values();
      output = outputsIter.next().value; 
      output = outputsIter.next().value; // LAUNCHPAD, hopefully
      //output.send( [0xb0, 0x00, 0x7f] );
    }
  }
}

function failure( error ) {
  console.log("Failed to initialize MIDI");
  console.log((error.code==1) ? "permission denied" : ("error code " + error.code));
}