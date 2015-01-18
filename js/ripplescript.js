var context;
var pads;

var COLORS = {
  GREY: [119, 119, 119],
  RED: [206, 24, 54],
  ORANGE: [248, 89, 49],
  YELLOW: [237, 185, 46],
  GREEN: [163, 169, 72],
  BLUE: [0, 153, 137],
} 

// Canvas
var QUALITY = 4;
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
      active: 0,
      color: COLORS.GREY,
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
  padwidth = ~~(mindim / 15 + 0.5);
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

    
    var thresh = 1.5;
    if (up[0] < thresh && down[0] < thresh && left[0] < thresh && right[0] < thresh) {
      continue;
    }
    
    // R, G, B
    for (var j = 0; j < 3; j++) {
      pixel[j] = ((up[j] + left[j] + down[j] + right[j]) / 2.001) - buffer2[i][j];
      pixel[j] = pixel[j] < 0 ? 0 : pixel[j];
      buffer2[i][j] = pixel[j];
      pixel[j] = 255 - pixel[j];
    }

    var psize = 5;
    for (var j = 0; j < psize; j++) {
      for (var k = 0; k < psize; k++) {
        var idx = (j * WIDTH + (i + k)) * 4;
        data[idx] = pixel[0];
        data[idx + 1] = pixel[1];
        data[idx + 2] = pixel[2];
      }
    }
    
  }
  tempbuffer = buffer1;
  buffer1 = buffer2;
  buffer2 = tempbuffer;

  rcontext.putImageData(image, 0, 0);
  meter.tick();
}

// ON BEAT *****************************************

function playbeat(beat) {
  console.log(beat);
  for (var i = beat * 8; i < beat * 8 + 8; i++) {
    if (pads[i].active != 0) {
      drop(i, pads[i].color);
    }
  }
}

// DRAWING *****************************************

function drawGrid() {
  var cursorx = topleftx;
  var cursory = toplefty;

  var idx = 0;
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      bcontext.fillStyle = 'rgb(' + pads[idx].color[0] + ',' + pads[idx].color[1] + ',' + pads[idx].color[2] + ')';
      bcontext.fillRect(cursorx, cursory, padwidth, padwidth);
      cursory += padwidth * 2;
      idx++;
    }
    cursorx += padwidth * 2;
    cursory = toplefty;
  }
}

function drop(i, color) {
  var cx = topleftx + (padwidth/2) + 2 * padwidth * Math.floor(i/8.0); 
  var cy = toplefty + (padwidth/2) + 2 * padwidth * (i % 8);
  var dropidx = Math.floor(cx / QUALITY) + (Math.floor(cy / QUALITY) * WIDTH);
  buffer1[dropidx][0] = 255 - color[0];
  buffer1[dropidx][1] = 255 - color[1];
  buffer1[dropidx][2] = 255 - color[2];
}

// CLICK DETECTION *********************************

function checkClickBox(e) {
  var ex = ~~(e.pageX + 0.5);
  var ey = ~~(e.pageY + 1.5);
  
  console.log(topleftx + " " + toplefty + " " + padwidth);
  if (ex < topleftx || ex > topleftx + 15*padwidth || 
      ey < toplefty || ey > toplefty + 15*padwidth) {
    return;
  }

console.log(ex + " " + ey + ": clicked");

  var cursorx = topleftx;
  var cursory = toplefty;

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
    cursory = toplefty;
  }

}

function padClicked(i) {
  console.log(i);
  if (pads[i].active == 1) {
    pads[i].color = COLORS.BLUE;
    pads[i].active = 2;
    drop(i, pads[i].color);
  } else if (pads[i].active == 2) {
    pads[i].color = COLORS.GREY;
    pads[i].active = 0;
  } else {
    pads[i].color = COLORS.RED;
    pads[i].active = 1;
    drop(i, pads[i].color);
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
      function(buffer) { pads[i].buffer = buffer; },
      onError
    )
  }

  request.send();
  $('#' + i).html('<span class="pad-label">' + pads[i].name + '</span>');
}

function onError() {
  alert('Something went wrong');
}

function playSound(i, delay) {
  if (!pads[i].buffer || i == -1) return;
  var source = context.createBufferSource();
  source.buffer = pads[i].buffer;
  var gainNode = context.createGain();
  source.connect(gainNode);
  gainNode.connect(context.destination);
  gainNode.gain.value = pads[i].gain;
  source.playbackRate.value = pads[i].pitch;
  source.start(delay);

  if (recording) {
    var newBeat = Math.floor(beat / interval);
    if (loopTimer.remaining < ((60000 / bpm) / (quant / 4)) / 2) {
      newBeat += interval;
    }
    for (j = 0; j < 4; j++) {
      if (queue[newBeat][j] == i) {
        return;
      } else if (queue[newBeat][j] == -1) {
        queue[newBeat][j] = i;
        return;
      }

    }
  }

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


// UPLOADS ***********************************

function dragDropUpload(i) {
  var trigger = $('#' + i);
  uploading = i;
  
  // Cancel default actions for dragover and dragenter
  $('#' + i).on(
      'dragover',
      function(e) {
          e.preventDefault();
          e.stopPropagation();
      }
  )
  $('#' + i).on(
      'dragenter',
      function(e) {
          e.preventDefault();
          e.stopPropagation();
      }
  )

  // Drop
  $('#' + i).on(
      'drop',
      function(e){
          if(e.originalEvent.dataTransfer){
              var files = e.originalEvent.dataTransfer.files;
              if(files.length) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleFiles(files, i);
              }   
          }
      }
  );
}

function handleFiles(files, i) {
  window.URL = window.URL || window.webkitURL;
  var file = files[0];
  pads[i].name = prompt("Enter a name for this sample","Untitled");
  loadSound(i, window.URL.createObjectURL(file));
  window.URL.revokeObjectURL(this.arc);
}

// ********** CONTROLS ********************

function changeVolume (element) {
  pads[beingEdited].gain = element.value;
  $('#vol-label').html("Volume    " + Math.floor(element.value*100) + "%");
}

function changePitch(element) {
  pads[beingEdited].pitch = element.value
  $('#detune-label').html("Tune    " + Math.floor((element.value-1)*133.34));
}

function modeSwitch(m) {
  editMode = m;
  if (!editMode) {
    $('#editmode').css("background-color", "white");
    $('#perfmode').css("background-color", "#FF9900");
    $('#perfmode').css("border", "2px solid #FF9900");
    $('#editmode').css("border", "2px solid #DDD;");
  } else {
     $('#editmode').css("background-color", "#FF9900");
     $('#perfmode').css("background-color", "white");
     $('#editmode').css("border", "2px solid #FF9900");
     $('#perfmode').css("border", "2px solid #DDD");
  }
}

// *************** RECORDING ***************************

var length = 2;
var quant = 8;
var bpm = 120;
var queue = new Array(16);
var recording = false;
var beat = 0;
var playing = false;
var paused = false;
var loopTimer = $.timer(playQueue, (60000 / bpm) / (quant * 2), false);
var quantlev = [0, 32, 16, 8, 4];
var lastpressedstop = false;
var interval = 1;
var counterTimer = $.timer(updateCounter, (60000 / bpm) / 4);
var sixteenths = 0;

function bindConsole() {

  // LENGTH
  for (var i = 1; i < 5; i++) {
    $('#' + i + 'bar').click(function() {
      for (var j = 1; j < 5; j++) {
        $('#' + j + 'bar').removeClass("active");
      }
      $(this).addClass("active");

      if (playing) {
        counterTimer.stop();
        loopTimer.stop();
        sixteenths = 0;
        beat = 0;
        loopTimer.play();
        counterTimer.play();
        resizeQueue($(this).attr("id")[0]);
      } else {
        length = $(this).attr("id")[0];
        resetQueue();
      }
      lastpressedstop = false;
    });
  }

  // QUANTIZATION
  for (var i = 1; i < 5; i++) {
    $('#' + i + 'quant').click(function() {
      for (var j = 1; j < 5; j++) {
        $('#' + j + 'quant').removeClass("active");
      }
      $(this).addClass("active");
      newquant = quantlev[$(this).attr("id")[0]];
      if (playing) {
        loopTimer.stop();
        counterTimer.stop();
        sixteenths = 0;
        beat = 0; 
        reQuant(newquant);
        loopTimer.play();
        counterTimer.play();
      } else {
        quant = newquant;
        resetQueue();
      }
      lastpressedstop = false;
    });

  }


  // Play
  $('#play').mousedown(function() {
    if (playing) {
      loopTimer.stop();
    }

    if ($(this).attr("class") != "active") {
      $(this).addClass("active");
    }
    $('#pause').removeClass("active");

    playing = true;
    if (!paused) {
      sixteenths = 0;
      beat = 0;
    }
    paused = false;
    playQueue();
    loopTimer = $.timer(playQueue, (60000 / bpm) / (quant / 4), false);
    counterTimer = $.timer(updateCounter, (60000 / bpm) / 4);
    loopTimer.play();
    counterTimer.play();
    lastpressedstop = false;
  });

  // Pause
  $('#pause').click(function() {
    if (paused) {
      loopTimer.play();
      counterTimer.play();
      $(this).removeClass("active");
      $('#play').addClass("active");
      paused = false;
    } else {
      if (playing) {
        loopTimer.pause();
        counterTimer.pause();
        $(this).addClass("active");
        $('#play').removeClass("active");
        paused = true;
      }
    }
    lastpressedstop = false;
  })

  // Record
  $('#record').click(function() {
    if ($(this).hasClass("active")) {
      $(this).removeClass("active");
      recording = false;
    } else {
      $(this).addClass("active");
      recording = true;
    }
  });

  // Stop
  $('#stop').click(function() {
    if ($('#play').addClass("active")) {
      $('#play').removeClass("active");
      $('#pause').removeClass("active");
      beat = 0;
      sixteenths = 0;
      playing = false;
      paused = false;
      loopTimer.stop();
      counterTimer.stop();
    }

    if (lastpressedstop) {
      resetQueue();
    } else {
      lastpressedstop = true;
    }

  })
}

function resetQueue() {
  console.log("cleared, " + (quant*length));
  for (var i = 0; i < (quant * length); i++) {
    queue[i] = [-1, -1, -1, -1, -1];
  }
}

function playQueue() {
  console.log("beat: " + beat + " ||| " + queue[beat][0] + " " + queue[beat][1] + " " + queue[beat][2] + " " + queue[beat][3]);
  for (var i = 0; i < 5; i++) {
    if (queue[beat][i] != -1) {
      playSound(queue[beat][i]);
      $('#' + queue[beat][i]).css({'background-color': '#FF9900'});
      var colorTimer = window.setTimeout(function() {
        $('.trigger').css({'background-color': 'white'});
      }, 100);
    }
  }

  beat++;
  if (beat >= (quant * length)) {
    beat = 0;
  }
  
}

function updateCounter() {
  sixteenths++;
  bars = (Math.floor(sixteenths / 16) % length) + 1;
  $('#counter').html(bars + "." + (Math.floor(sixteenths / 4) % 4 + 1) + "." + (sixteenths % 4 + 1));

}

function changeBPM(element) {
  bpm = element.value;
  $('#bpm-label').html(bpm + " BPM");
  loopTimer.set({time: (60000 / bpm) / (quant / 4)});
  counterTimer.set({time: (60000 / bpm) / 4});
}

function resizeQueue(newSize) {
  if (newSize == length) return;
  if (newSize * quant > queue.length) {
    var newQueue = new Array(newSize * quant);
    for (var i = 0; i < (newSize * quant); i++) {
      if (i < queue.size) {
        newQueue[i] = queue[i];
      } else {
        newQueue[i] = [-1, -1, -1, -1, -1];
      }
    }
  } else {
    var newQueue = queue.slice(0, newSize * quant);
  }
  queue = newQueue;
  length = newSize;
}

function reQuant(newQuant) {
  if (newQuant == quant) return;
  if (newQuant < quant) {
    interval = (quant / newQuant);
    return;
  } else {
    var newQueue = new Array(length * newQuant);
    for (var i = 0; i < queue.length; i++) {
      newQueue[i * (newQuant / quant)] = queue[i];
    }
    for (var i = 0; i < newQueue.length; i++) {
      if (!newQueue[i]) {
        newQueue[i] = [-1, -1, -1, -1, -1];
      }
    }
    queue = newQueue;
  }
  quant = newQuant;
  loopTimer.set({time: (60000 / bpm) / (quant / 4)});
}