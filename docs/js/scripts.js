let c = document.getElementById("board"),
  ctx = c.getContext("2d"),
  soundPlayer = document.getElementById("sound-player"),
  tingPlayer = document.getElementById("ting-player"),
  scoreBanner = document.getElementById("match-score");
const serverURL = "http://10.25.0.56:8888", BOARD_WID = 4,
  COLORS = [[219, 90, 107], [0, 113, 188]], ROUND_LIMIT = 2;

soundPlayer.src = 'ph2.mp3';
tingPlayer.src = 'ting.mp3';


class Animate {
  constructor(tout, from, to, callback) {
    this.callback = callback;
    this.tout = tout;
    this.from = from;
    this.to = to;
    this.st = Date.now();
  }

  Progress() {
    let p = (Date.now() - this.st) / this.tout;
    return p;
  }

  Current() {
    let p = this.Progress(), fin = false;
    if (p > 1) {
      p = 1;
      fin = true;
    }
    let x = this.from + (this.to - this.from) * p;
    if (fin && this.callback)
      this.callback();
    return x;
  }
};

class Piece {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.scale = 1;
  }

  Paint() {
    if (this.scaleAnimate)
      this.scale = this.scaleAnimate.Current();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);

    ctx.beginPath();
    const GRAD_RATIO = 0.8;
    ctx.arc(0, 0, RADIUS, 0, 2 * Math.PI);
    let g = ctx.createRadialGradient(0, 0, RADIUS, 0, 0, RADIUS * GRAD_RATIO);
    let color = (255 - 100) * this.color + 100;
    g.addColorStop(0, `rgb(${color - 50},${color - 50},${color - 50})`);
    g.addColorStop(1, `rgb(${color},${color},${color})`);
    ctx.fillStyle = g;

    // ctx.fillStyle='rgb(255,255,255)';
    ctx.fill();
    ctx.closePath();

    ctx.restore();
  }
};

function Load(fname) {
  let x = new Image();
  x.src = fname;
  return x;
}

const PAD = 1200 * 0.15, RC_WIDTH = 1200 * 0.7 / (BOARD_WID - 1), RADIUS = RC_WIDTH * 0.2;

let opos = [], ofig = [Load("b2.png"), Load("w2.png")],
  focusPos, mousePos, movingOPos, choicePos, movingAdv,
  playing, resultShow, winner = -1,
  gameOverShade,
  score = 0,
  selfColor = 0,
  osequence = [], begun = false, opWinLocs = undefined, hintMove = undefined, resultFadeOut = undefined,
  selectedPos = [], downFocusPos, currentHl = [], rndOps = 0;

function GetColor(alpha) {
  let c = COLORS[roundCnt % 2];
  return `RGBA(${c[0]},${c[1]},${c[2]},${alpha})`;
}
function Main() {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.5;

  ctx.save();

  let W2 = (s) => { while (s.length < 2) s = '0' + s; return s; };
  let strength = Math.floor(score / 100 * 255);
  ctx.shadowColor = '#' + (strength < 0 ? W2((-strength).toString(16)) + '00' : '00' + W2((strength).toString(16))) + '00';
  //console.log('#' + (score < 0 ? W2((-score).toString(16)) + '00' : '00' + W2((score).toString(16))) + '00');
  ctx.shadowBlur = 10;
  //console.log(ctx.shadowColor, ctx.shadowBlur);
  for (let i = 0; i < BOARD_WID; ++i) {
    ctx.beginPath();
    ctx.moveTo(PAD + RC_WIDTH * i, PAD);
    ctx.lineTo(PAD + RC_WIDTH * i, c.width - PAD);
    ctx.stroke();
  }
  for (let i = 0; i < BOARD_WID; ++i) {
    ctx.beginPath();
    ctx.moveTo(PAD, PAD + RC_WIDTH * i);
    ctx.lineTo(c.width - PAD, PAD + RC_WIDTH * i);
    ctx.stroke();
  }
  let DrawDot = (x, y) => {
    x = PAD + RC_WIDTH * x;
    y = PAD + RC_WIDTH * y;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fill();
  };

  // DrawDot(3, 3);
  // DrawDot(7, 7);color
  // DrawDot(11, 11);
  // DrawDot(3, 11);
  // DrawDot(11, 3);
  ctx.shadowBlur = 7;
  ctx.shadowColor = '#000000'


  const DROP_Animate_SPEED = 0.2;

  ctx.save();
  ctx.shadowColor = GetColor(1);
  for (let o of opos) {
    if (o.pair && o.pairStroke) {
      ctx.save();
      ctx.beginPath();
      ctx.globalAlpha = o.pairStrokeAnimate.Current();
      ctx.moveTo(o.x, o.y);
      ctx.quadraticCurveTo(o.pairStroke.x1, o.pairStroke.y1, o.pair.x, o.pair.y);
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();

  for (let o of opos)
    if (o.color != -1 || o.hintBlink != undefined) {
      if (o.dropAnimateGoal != undefined) {
        o.x += (o.dropAnimateGoal.x - o.x) * DROP_Animate_SPEED;
      }
      let hintBlink = false;
      if (o.color == -1 && o.hintBlink != undefined) {
        ctx.save();
        hintBlink = true;
        let p = o.hintBlink.Progress();
        p = p * 5 - Math.floor(p * 5);
        ctx.globalAlpha = p < 0.5 ? p / 0.5 : (1 - p) / 0.5;
        o.color = selfColor;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FF0000'
      }
      if (o.selected) {
        ctx.save();
        ctx.shadowColor = GetColor(1);
        ctx.shadowBlur = o.hl ? 40 + 20 * Math.sin((Date.now() - o.hl) / 150) : 20;
      }
      o.Paint();
      if (o.selected) {
        ctx.restore();
      }

      if (hintBlink) {
        o.color = -1;
        ctx.restore();
      }
    }

  // if (movingOPos != undefined && mousePos != undefined) {
  //   let dx = mousePos.x - movingOPos.x, dy = mousePos.y - movingOPos.y;
  //   movingOPos.x += dx * 0.3;
  //   movingOPos.y += dy * 0.3;
  //   OPaint(1, { x: movingOPos.x, y: movingOPos.y, color: selfColor });
  // }

  if (movingAdv != undefined) {
    let dx = choicePos.x - movingAdv.x, dy = choicePos.y - movingAdv.y;
    movingAdv.x += dx * 0.3;
    movingAdv.y += dy * 0.3;
    OPaint(1, { x: movingAdv.x, y: movingAdv.y, color: 1 - selfColor });
    if (dx < 1) {
      choicePos.color = 1 - selfColor;
      //console.log(opos);
      movingAdv = undefined;
      choicePos.scaleAnimate = new Animate(50, () => {
        choicePos.scaleAnimate = undefined;
        soundPlayer.play();
        if (opWinLocs != undefined)
          GameOver(opWinLocs, selfColor ^ 1);
        else
          PlayBegin();
      });
    }
  }

  if (gameOverShade != undefined) {
    let p = gameOverShade.Progress();
    ctx.fillStyle = 'rgba(255,255,255,' + (p < 0.1 ? (p / 0.1) : (p < 0.5 ? 1 : 1 - (p - 0.5) / 0.5)).toString() + ')';
    ctx.fillRect(0, 0, c.width, c.height);
    if (p > 0.1) {
      resultShow = true;
      resultFadeOut = undefined;
    }
    if (p == 1)
      $('#restart-match').removeAttr("disabled");
  }
  ctx.globalAlpha = 1;
  if (winner != -1)
    for (let o of opos)
      if (o.solid)
        OPaint(0.8, o);

  if (resultShow) {
    ctx.save();
    if (resultFadeOut != undefined) {
      ctx.globalAlpha = 1 - resultFadeOut.Progress();
      //console.log(resultFadeOut.Progress());
    }
    if (gameOverShade != undefined) {
      let p = gameOverShade.Progress();
      ctx.globalAlpha = p < 0.5 ? 0 : (p - 0.5) / 0.5;

    }
    ctx.shadowColor = winner == 2 ? '#000000' : (winner == selfColor ? '#00FF00' : '#FF0000');
    ctx.shadowBlur = 10;
    ctx.font = '800px wzm';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(winner == selfColor ? '胜' : (winner == 2 ? '平' : '败'), 150, 850);
    ctx.restore();
  }
  ctx.restore();

  requestAnimationFrame(Main);
};

function Distance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function PlayBegin() {
  if (winner == -1) {
    UnblockButtons();
    playing = true;
    focusPos = mousePos = undefined;
    movingOPos = { x: 1200, y: 1200 };
  }
}

function GameOver(s, wh) {
  let seq = [];
  for (let i of s)
    seq.push(opos[i[0] * BOARD_WID + i[1]])
  for (let o of seq)
    o.solid = true;
  winner = wh;
  gameOverShade = new Animate(3000,
    () => {
      gameOverShade = undefined;
    }
  );
}

let firstGame = true;

function BlockButtons() {
  $("#restart-match").attr("disabled", "true");
  $('#retreat-move').attr("disabled", "true");
  $('#btn-hint').attr("disabled", "true");
}

function UnblockButtons() {
  $("#restart-match").removeAttr("disabled");
  $('#retreat-move').removeAttr("disabled");
  $('#btn-hint').removeAttr("disabled");
}

function UpdateBars() {
  let bars = '', bl = [];
  let ulim = selectedPos.length == 0 ? -1 : Math.ceil(180 / selectedPos.length);

  for (let id of selectedPos) {
    let i = Math.floor(id / BOARD_WID), j = id % BOARD_WID;
    let label = undefined;
    if (opos[id].pair) {
      if (opos[id].pair.id > id) {
        let i0 = Math.floor(opos[id].pair.id / BOARD_WID), j0 = opos[id].pair.id % BOARD_WID;
        label = `(${i}, ${j}) & (${i0}, ${j0})`;
      }
    } else {
      label = `(${i}, ${j})`;
    }
    if (label) {
      if (!opos[id].inputAngle)
        opos[id].inputAngle = 0;
      opos[id].inputAngle = Math.min(opos[id].inputAngle, ulim);
      opos[id].inputAngle = Math.max(opos[id].inputAngle, -ulim);
      bars += `<tr id="bars-for-${id}" class="bars-row">
        <td class="pos-name" id="pos-name-${id}">
        ${label}
        </td>
        <td class="angle-bar">
          <input type="range" min="-${ulim}" max="${ulim}" value="${opos[id].inputAngle}" class="slider" id="angle-bar-${id}">
        </td>
        <td>
          <input class="form-control angle-input" value="${opos[id].inputAngle}" id="angle-input-${id}">
        </td>
      </tr>`;
      bl.push(id);
    }
  }

  document.getElementById('bars').style.opacity = 0;
  setTimeout(() => {
    $('#angle-lim').html(selectedPos.length == 0 ? '' : `Angle upper limit: ${ulim}`);
    document.getElementById('bars-body').innerHTML = bars;
    $('#submit-btn-wrapper').css("visibility", selectedPos.length == 0 ? "hidden" : "visible");
    $('#submit-btn').css("display", "inline-block");
    $('#loading-anim').css("display", "none");
    function Unhignlight() {
      for (let i of currentHl)
        i.hl = undefined;
    }
    function Highlight(id) {
      function ChangeHl(nhl) {
        currentHl = nhl;
        let now = Date.now();
        for (let i of currentHl)
          i.hl = now;
      }
      if (opos[id].pair)
        ChangeHl([opos[id], opos[id].pair]);
      else
        ChangeHl([opos[id]]);
    }

    for (let id of bl) {

      $(`#angle-input-${id}`).on("focus", () => {
        console.log(id);
        Highlight(id);
      });
      $(`#angle-bar-${id}`).on("focus", () => {
        console.log(id);
        Highlight(id);
      });

      $(`#angle-input-${id}`).on("focusout", () => {
        console.log(id);
        Unhignlight();
      });

      $(`#angle-bar-${id}`).on("focusout", () => {
        console.log(id);
        Unhignlight();
      });

      $(`#angle-input-${id}`).on("change", () => {
        let v = $(`#angle-input-${id}`).val();
        console.log('input', v);
        opos[id].inputAngle = v;
        $(`#angle-bar-${id}`).val(v);
      });
      $(`#angle-bar-${id}`).on("change", () => {
        let v = $(`#angle-bar-${id}`).val();
        console.log('bar', v);
        opos[id].inputAngle = v;
        $(`#angle-input-${id}`).val(v);
      });
    }

    document.getElementById('bars').style.opacity = 1;
  }, 100)

}


const DROP_O_TOUT = 2000;

function ScoreChange(newScore) {
  score = newScore;
  // setInterval(() => {
  //   let x = parseInt(scoreBanner.innerHTML);
  //   if (x == score)
  //     clearInterval();
  //   else
  //     scoreBanner.innerHTML = x + (x < score ? 1 : -1);
  // }, 10);
}

function Init() {
  for (let o of opos)
    if (o.color != -1) {
      //let ang = Math.random() * Math.PI * 2;
      setTimeout(() => {
        o.dropAnimateGoal = {
          x: 1500,//o.x + Math.cos(ang) * 500,
          y: o.y + Math.random() * 300 - 150//, + Math.sin(ang) * 500
        }
      }, Math.random() * 500);
    }

  focusPos = opWinLocs = mousePos = undefined;
  setTimeout(() => {
    firstGame = false;
    begun = false;
    $('#switch-input').removeAttr("disabled");
    $('#btn-start').removeAttr("disabled");
    BlockButtons();
    ScoreChange(0);
    opos = [];
    osequence = [];
    for (let i = 0; i < BOARD_WID; ++i)
      for (let j = 0; j < BOARD_WID; ++j) {
        // opos.push({ x: PAD + i * RC_WIDTH, y: PAD + j * RC_WIDTH, color: 0.5 });
        opos.push(new Piece(PAD + i * RC_WIDTH, PAD + j * RC_WIDTH, 0.5));
        opos[opos.length - 1].id = opos.length - 1;
      }
    let cnt = 0;
    // setInterval(() => {
    //   // console.log(Math.sin(cnt / 1000) / 2);
    //   for (let o of opos)
    //     o.color = Math.sin(cnt / 100) / 2 + 0.5;
    //   cnt += 1;
    // }, 1);

    winner = -1;
  },
    firstGame ? 0 : DROP_O_TOUT)
}

let thinkingDotCount = 0;
function RefreshThinkingDots() {
  let s = '';
  while (s.length < thinkingDotCount)
    s += '.'
  $('#thinking').html(s);
};


let record = {
  actions: [],
  qubit_num: BOARD_WID * BOARD_WID,
  rotations: [],
  positions: [],
  actions_num: []
};

let roundCnt = 0;
function Submit() {
  $('#submit-btn').css("display", "none");
  $('#loading-anim').css("display", "inline-block");

  // let col = [];
  // for (let o of opos)
  //   col.push(o.color);
  // thinkingDotCount = 0;
  // askingForHint = hint;
  // RefreshThinkingDots();
  // $('#thinking').css("visibility", "visible");
  function ConvAngle(x) {
    let v = Math.PI * parseInt(x) / 180;
    console.log(x, parseInt(x));
    if (v < 0)
      v += Math.PI * 2;
    return v;
  }

  for (let id of selectedPos) {
    if (opos[id].pair) {
      if (opos[id].pair.id > id) {
        record.actions.push(1);
        record.positions.push(id);
        record.positions.push(opos[id].pair.id);
        record.actions_num.push(1);
        record.rotations.push(ConvAngle(opos[id].inputAngle));
      }
    } else {
      record.actions.push(0);
      record.positions.push(id);
      record.actions_num.push(1);
      record.rotations.push(ConvAngle(opos[id].inputAngle));
    }
  }

  $.ajax({
    async: true,
    url: serverURL + '/login',
    method: 'POST',
    data: {
      json: JSON.stringify({
        qubit_num: record.qubit_num,
        actions: record.actions,
        rotations: record.rotations,
        positions: record.positions,
        actions_num: record.actions_num
      })
    },
    success: (resp) => {
      let freq = JSON.parse(resp).freq;
      for (let i in freq)
        opos[i].color = 1 - freq[i];
      for (let i of currentHl)
        i.hl = undefined;
      currentHl = [];
      for (let o of opos)
        if (o.locked)
          o.locked--;
      for (let id of selectedPos) {
        let o = opos[id];
        o.locked = 1;
        o.selected = false;
        o.inputAngle = undefined;
        o.pair = undefined;
      }
      selectedPos = [];
      rndOps = 0;
      UpdateBars();
      roundCnt += 1;
    },
    error: (resp) => {
      alert('网络连接失败');
    }
  })
}

const wzmFont = new FontFace('wzm', 'url(./SentyWEN2017.ttf)');
window.onload = function () {
  wzmFont.load().then(font => {
    document.fonts.add(font)
  }).then(() => {
    Init();
    PlayBegin();


    let premmev = { x: 0, y: 0 }, lastFocusSelected = undefined
    c.onmousemove = function (event) {
      if (playing) {
        let e = { x: event.offsetX * 2, y: event.offsetY * 2 };
        if (Math.abs(premmev.x - e.x) < 5 && Math.abs(premmev.y - e.y) < 5)
          return;
        premmev = e;

        let preFocus = focusPos;
        focusPos = undefined;
        // console.log('pre', preFocus);
        for (let o of opos)
          if (!o.locked && Distance(o, e) <= (o.scaleAnimate ? o.scaleAnimate.Current() : 1) * RADIUS) {
            if (o.selected || rndOps < ROUND_LIMIT)
              focusPos = o;
          }
        if (preFocus != focusPos) {
          // console.log('in', preFocus);
          if (preFocus && !preFocus.hang) {

            // console.log(preFocus, focusPos);
            if (preFocus.scaleAnimate) {
              let start = preFocus.scaleAnimate.Current();
              preFocus.scaleAnimate = new Animate(50, start, 1);
            } else {
              preFocus.scaleAnimate = new Animate(50, 1.5, 1);
            }
          }
          function GetID(x) {
            if (x.pair)
              return Math.min(x.id, x.pair.id);
            else
              return x.id;
          }

          if (focusPos && focusPos.selected && focusPos != lastFocusSelected) {
            if (lastFocusSelected) {
              id = GetID(lastFocusSelected);
              $(`#bars-for-${id}`).css("border-color", GetColor(0));
            }
            id = GetID(focusPos);
            $(`#bars-for-${id}`).css("border-color", GetColor(1));
            lastFocusSelected = focusPos;
          }

          if (focusPos)
            focusPos.scaleAnimate = new Animate(50, 1, 1.5);
        }
      }
    };

    c.onmousedown = function (event) {
      // console.log({ x: event.offsetX * 2, y: event.offsetY * 2 });
      if (focusPos != undefined) {
        downFocusPos = focusPos;
        if (!downFocusPos.selected)
          downFocusPos.hang = true;
      }
    };

    // setInterval(() => { console.log(rndOps) }, 1000)
    c.onmouseup = function (event) {
      // console.log({ x: event.offsetX * 2, y: event.offsetY * 2 });

      if (focusPos) {
        if (downFocusPos == focusPos) {
          // choicePos = focusPos;
          // choicePos.selected ^= 1;
          focusPos.selected ^= 1;
          if (focusPos.selected) {
            selectedPos.push(focusPos.id);
            rndOps++;
          } else {
            rndOps--;
            selectedPos.splice(selectedPos.indexOf(focusPos.id), 1);
            focusPos.inputAngle = undefined;

            if (focusPos.pair) {
              let pa = focusPos.pair.id;
              focusPos.pair = undefined;
              opos[pa].pair = undefined;
              selectedPos.splice(selectedPos.indexOf(pa), 1);
              opos[pa].selected = false;
              opos[pa].scaleAnimate = new Animate(50, 1.5, 1);
              opos[pa].inputAngle = undefined;
            }
          }
          UpdateBars();
          // osequence.push(choicePos); 悔棋？
          // choicePos.scaleAnimate = new Animate(50, () => {
          //   soundPlayer.play();
          // });
          // movingOPos = focusPos = mousePos = undefined;
          // playing = false;
        } else if (!downFocusPos.selected && !focusPos.selected) {
          rndOps++;
          focusPos.selected ^= 1;
          downFocusPos.selected ^= 1;
          selectedPos.push(focusPos.id);
          selectedPos.push(downFocusPos.id);
          downFocusPos.pair = focusPos;
          focusPos.pair = downFocusPos;
          let small = downFocusPos.id < focusPos.id ? downFocusPos : focusPos;
          small.pairStroke = { x1: small.x - 50, y1: small.y - 50 };
          small.pairStrokeAnimate = new Animate(50, 0, 1);
          UpdateBars();
        }
      }
      console.log(downFocusPos);
      if (downFocusPos) {
        downFocusPos.hang = false;
        // if (!downFocusPos.selected)
        downFocusPos.scaleAnimate = new Animate(50, 1.5, 1);
      }
      downFocusPos = undefined;
    }

    $('#switch-input').change(() => {
      //console.log('clicked');
      selfColor = $('#switch-input').is(':checked') ? 1 : 0;
    });

    $("#restart-match").click(() => {
      Init();
      resultFadeOut = new Animate(DROP_O_TOUT, () => {
        resultShow = false;
        $('#btn-start').removeAttr("disabled");
      });
    });
    $('#retreat-move').click(() => {
      osequence.pop().p.color = -1;
      osequence.pop().color = -1;
      ScoreChange(osequence[osequence.length - 1].s)
    });

    $('#btn-start').click(() => {
      $('#btn-start').attr("disabled", "true");
      $('#switch-input').attr("disabled", "true");
      $('#btn-hint').removeAttr("disabled");
      begun = false;
      if (selfColor == 0)
        PlayBegin();
      else {
        BlockButtons();
        AskServer();
      }
    });
    $('#btn-close').click(() => {
      ipc.send('close');
    });
    $('#btn-hint').click(() => {
      if (hintMove == undefined)
        AskServer(true);
      $('#btn-hint').attr("disabled", "true");
    });

    setInterval(() => {
      thinkingDotCount = (thinkingDotCount + 1) % 5;
      RefreshThinkingDots();
    }, 500);
    BlockButtons();
    Main();
  });
};