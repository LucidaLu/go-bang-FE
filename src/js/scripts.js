let c = document.getElementById("board"),
    ctx = c.getContext("2d"),
    soundPlayer = document.getElementById("sound-player"),
    tingPlayer = document.getElementById("ting-player"),
    scoreBanner = document.getElementById("match-score");
const serverURL = "http://127.0.0.1:8888", BOARD_WID = 15;

soundPlayer.src = 'ph2.mp3';
tingPlayer.src = 'ting.mp3';

class Animation {
    constructor(tout, callback) {
        this.callback = callback;
        this.tout = tout;
        this.st = Date.now();
    }

    Progress() {
        let p = (Date.now() - this.st) / this.tout;
        if (p > 1) {
            p = 1;
            this.callback();
        }
        return p;
    }
};

function Load(fname) {
    let x = new Image();
    x.src = fname;
    return x;
}

const PAD = 60, RC_WIDTH = 77.142857142;
let opos = [], ofig = [Load("b2.png"), Load("w2.png")],
    focusPos, mousePos, movingOPos, choicePos, movingAdv,
    playing, resultShow, winner = -1,
    gameOverShade,
    score = 0,
    selfColor = 0,
    osequence = [], begun = false, opWinLocs = undefined;

function OPaint(s, o) {
    //console.log(s, o);
    const O_CENTER_POS = 222;
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.scale(s, s);
    ctx.drawImage(ofig[o.color], -O_CENTER_POS, -O_CENTER_POS);
    ctx.restore();
}

function Main() {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;

    ctx.save();

    if (resultShow) {
        ctx.save();
        if (resultFadeOut != undefined) {
            ctx.globalAlpha = 1 - resultFadeOut.Progress();
            //console.log(resultFadeOut.Progress());
        }
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 10;
        ctx.font = '800px wzm';
        ctx.fillText(winner == selfColor ? '胜' : (winner == 2 ? '平' : '败'), 150, 850);
        ctx.restore();
    }

    let W2 = (s) => { while (s.length < 2) s = '0' + s; return s; };
    ctx.shadowColor = '#' + (score < 0 ? W2((-score).toString(16)) + '00' : '00' + W2((score).toString(16))) + '00';
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
    DrawDot(3, 3);
    DrawDot(7, 7);
    DrawDot(11, 11);
    DrawDot(3, 11);
    DrawDot(11, 3);
    ctx.shadowBlur = 7;
    ctx.shadowColor = '#000000'

    const DROP_ANIMATION_SPEED = 0.2;
    for (let o of opos)
        if (o.color != -1) {
            if (o.dropAnimationGoal != undefined) {
                o.x += (o.dropAnimationGoal.x - o.x) * DROP_ANIMATION_SPEED;
            }
            OPaint((o.scaleAnimation == undefined ? 0 : 1 - o.scaleAnimation.Progress()) * 0.06 + 0.14, o)
        }

    if (movingOPos != undefined && mousePos != undefined) {
        let dx = mousePos.x - movingOPos.x, dy = mousePos.y - movingOPos.y;
        movingOPos.x += dx * 0.3;
        movingOPos.y += dy * 0.3;
        OPaint(0.20, { x: movingOPos.x, y: movingOPos.y, color: selfColor });
    }

    if (movingAdv != undefined) {
        let dx = choicePos.x - movingAdv.x, dy = choicePos.y - movingAdv.y;
        movingAdv.x += dx * 0.3;
        movingAdv.y += dy * 0.3;
        OPaint(0.20, { x: movingAdv.x, y: movingAdv.y, color: 1 - selfColor });
        if (dx < 1) {
            choicePos.color = 1 - selfColor;
            //console.log(opos);
            movingAdv = undefined;
            choicePos.scaleAnimation = new Animation(50, () => {
                choicePos.scaleAnimation = undefined;
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
        ctx.fillStyle = 'rgba(255,255,255,' + (p < 0.1 ? (p / 0.1) : 1 - (p - 0.1) / 0.9).toString() + ')';
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
                OPaint(0.14, o);
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
        seq.push(opos[i[0] * 15 + i[1]])
    for (let o of seq)
        o.solid = true;
    winner = wh;
    gameOverShade = new Animation(5000,
        () => {
            gameOverShade = undefined;
        }
    );
}

let firstGame = true;

function BlockButtons() {
    $("#restart-match").attr("disabled", "true");
    $('#retreat-move').attr("disabled", "true");
}

function UnblockButtons() {
    $("#restart-match").removeAttr("disabled");
    $('#retreat-move').removeAttr("disabled");
}



const DROP_O_TOUT = 2000;
function Init() {
    for (let o of opos)
        if (o.color != -1) {
            //let ang = Math.random() * Math.PI * 2;
            setTimeout(() => {
                o.dropAnimationGoal = {
                    x: 1500,//o.x + Math.cos(ang) * 500,
                    y: o.y + Math.random() * 300 - 150//, + Math.sin(ang) * 500
                }
            }, Math.random() * 500);
        }

    playing = false;
    focusPos = opWinLocs = mousePos = undefined;
    setTimeout(() => {
        firstGame = false;
        begun = false;
        $('#switch-input').removeAttr("disabled");
        $('#btn-start').removeAttr("disabled");
        opos = [];
        osequence = [];
        for (let i = 0; i < BOARD_WID; ++i)
            for (let j = 0; j < BOARD_WID; ++j)
                opos.push({ x: PAD + i * RC_WIDTH, y: PAD + j * RC_WIDTH, color: -1 });
        winner = -1;
    },
        firstGame ? 0 : DROP_O_TOUT)
}

function Retreat() {
    osequence.pop().color = -1;
}

let thinkingDotCount = 0;
function RefreshThinkingDots() {
    let s = '';
    while (s.length < thinkingDotCount)
        s += '.'
    $('#thinking').html(s);
};

function AskServer() {
    let col = [];
    for (let o of opos)
        col.push(o.color);
    thinkingDotCount = 0;
    RefreshThinkingDots();
    $('#thinking').css("visibility", "visible");
    $.ajax({
        async: true,
        url: serverURL + '/server',
        method: 'POST',
        dataType: 'json',
        data: { json: JSON.stringify({ board: col, person: selfColor, machine: selfColor ^ 1, ratio: parseInt($("#ad-slider").val()) / 100, difficulty: parseInt($("#diff-slider").val()) * 2 }) },
        success: (resp) => {
            $('#thinking').css("visibility", "hidden");
            if (resp.result == "win")
                GameOver(resp.loc, selfColor);
            else if (resp.result == "tie" && resp.position == undefined)
                GameOver([], 2);
            choicePos = opos[resp.position[0] * 15 + resp.position[1]];
            //console.log(resp.position[0] * 15 + resp.position[1]);
            score = resp.score;
            setInterval(() => {
                let x = parseInt(scoreBanner.innerHTML);
                if (x == score)
                    clearInterval();
                else
                    scoreBanner.innerHTML = x + (x < score ? 1 : -1);
            }, 10);
            osequence.push(choicePos);
            movingAdv = { x: 0, y: 0 };
            if (resp.result == "lose")
                opWinLocs = resp.loc;
            else if (resp.result == "tie")
                GameOver([], 2);
        },
        error: (resp) => {
            console.log('error', resp);
        }
    })
}

const wzmFont = new FontFace('wzm', 'url(https://storage.lucida.site/43823586ec4dc3b059f7/SentyWEN.ttf)');
window.onload = function () {
    wzmFont.load().then(font => {
        document.fonts.add(font)
    }).then(() => {
        Init();
        c.onmousemove = function (event) {
            if (playing) {
                let e = { x: event.offsetX * 2, y: event.offsetY * 2 };
                mousePos = e;
                focusPos = undefined;
                for (let o of opos)
                    if (o.color == -1 && Distance(o, e) <= 30)
                        focusPos = o;
                if (focusPos != undefined)
                    mousePos = focusPos;
            }
        };
        c.onmousedown = function (event) {
            if (focusPos != undefined) {
                BlockButtons();
                choicePos = focusPos;
                osequence.push(choicePos);
                choicePos.color = selfColor;

                choicePos.scaleAnimation = new Animation(50, () => {
                    choicePos.scaleAnimation = undefined;
                    soundPlayer.play();
                    AskServer();
                });
                movingOPos = focusPos = mousePos = undefined;
                playing = false;
            }
        };

        $('#switch-input').change(() => {
            //console.log('clicked');
            selfColor = $('#switch-input').is(':checked') ? 1 : 0;
        });

        $("#restart-match").click(() => {
            Init();
            resultFadeOut = new Animation(DROP_O_TOUT, () => {
                resultShow = false;
                $('#btn-start').removeAttr("disabled");
            });
        });
        $('#retreat-move').click(() => {
            Retreat();
            Retreat();
        });

        $('#btn-start').click(() => {
            $('#btn-start').attr("disabled", "true");
            $('#switch-input').attr("disabled", "true");
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

        setInterval(() => {
            thinkingDotCount = (thinkingDotCount + 1) % 5;
            RefreshThinkingDots();
        }, 500);
        Main();
    });
};