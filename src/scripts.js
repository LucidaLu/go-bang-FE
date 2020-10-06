const serverURL = 'http://127.0.0.1',
    BLACK = 0, WHITE = 1;
let c = document.getElementById("board"),
    ctx = c.getContext("2d"),
    soundPlayer = document.getElementById("sound-player"),
    tingPlayer = document.getElementById("ting-player"),
    scoreBanner = document.getElementById("match-score");

soundPlayer.src = 'ph2.mp3';
tingPlayer.src = 'ting.mp3';

function Load(fname) {
    let x = new Image();
    x.src = fname;
    return x;
}

const PAD = 60, W = 72;
let opos = [], ofig = [Load("b2.png"), Load("w2.png")], focusPos, mousePos, movingOPos, choicePos, playing, movingAdv, selfColor = BLACK;

function OPaint(s, o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.scale(s, s);
    ctx.drawImage(ofig[o.color], -222, -222);
    ctx.restore();
}


let chance = 0;


function Main() {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;

    ctx.save();

    ctx.shadowColor = '#' + (chance < 0 ? (-chance).toString(16) + '00' : '00' + (chance).toString(16)) + '00';//'#FF0000';
    //console.log(ctx.shadowColor);
    ctx.shadowBlur = 10;
    for (let i = 0; i < 16; ++i) {
        ctx.beginPath();
        ctx.moveTo(PAD + W * i, PAD);
        ctx.lineTo(PAD + W * i, 1200 - PAD);
        ctx.stroke();
    }
    for (let i = 0; i < 16; ++i) {
        ctx.beginPath();
        ctx.moveTo(PAD, PAD + W * i);
        ctx.lineTo(1200 - PAD, PAD + W * i);
        ctx.stroke();
    }

    ctx.shadowBlur = 7;
    ctx.shadowColor = '#000000'

    for (let o of opos)
        if (o.color != -1) {
            ctx.save();
            if (o.shadowAnimation != undefined && o.shadowAnimation.active) {
                ctx.shadowColor = "#FF0000";
                let p = o.shadowAnimation.Progress();
                if (p < 0.2) {
                    ctx.shadowBlur = 200;// * (p / 0.2);
                } else {
                    if (o.shadowAnimation != undefined && !o.shadowAnimation.trig) {
                        o.shadowAnimation.trig = true;
                        tingPlayer.play();
                    }
                    ctx.shadowBlur = 200;// * ((1 - p) / 0.8);
                }
            }
            OPaint((o.scaleAnimation == undefined ? 0 : 1 - o.scaleAnimation.Progress()) * 0.06 + 0.14, o);
            ctx.restore();
        }

    if (movingOPos != undefined && mousePos != undefined) {
        let dx = mousePos.x - movingOPos.x, dy = mousePos.y - movingOPos.y;
        movingOPos.x += dx * 0.3;
        movingOPos.y += dy * 0.3;
        OPaint(0.20, { x: movingOPos.x, y: movingOPos.y, color: 0 });
    }

    if (movingAdv != undefined) {
        let dx = choicePos.x - movingAdv.x, dy = choicePos.y - movingAdv.y;
        movingAdv.x += dx * 0.3;
        movingAdv.y += dy * 0.3;
        OPaint(0.20, { x: movingAdv.x, y: movingAdv.y, color: 1 });
        if (dx < 1) {
            choicePos.color = 1;
            movingAdv = undefined;
            choicePos.scaleAnimation = {
                st: Date.now(),
                Progress: () => {
                    let p = (Date.now() - choicePos.scaleAnimation.st) / 50;
                    if (p > 1) {
                        p = 1;
                        choicePos.scaleAnimation = undefined;
                        soundPlayer.play();
                        PlayBegin();
                    }
                    //console.log(p);
                    return p;
                }
            };
        }
    }

    ctx.restore();

    requestAnimationFrame(Main);
};

function Distance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function PlayBegin() {
    playing = true;
    focusPos = mousePos = undefined;
    movingOPos = { x: 1200, y: 1200 };
}

function Win(s) {
    let seq = [];
    for (let p of s) {
        seq.push(opos[p.x * 16 + p.y]);
        if (seq[seq.length - 1].color != 0)
            return;
    }
    console.log(seq);
    for (let i = 0; i < seq.length; ++i)
        seq[i].shadowAnimation = {
            active: i == "0",
            st: Date.now(),
            Progress: () => {
                let p = (Date.now() - seq[i].shadowAnimation.st) / 1000;
                if (p > 1) {
                    seq[i].shadowAnimation = undefined;
                    if (i != 4) {
                        seq[i + 1].shadowAnimation.active = true;
                        seq[i + 1].shadowAnimation.st = Date.now();
                    }
                }
            }
        }
    console.log(seq);
}

const wzmFont = new FontFace('wzm', 'url(https://storage.lucida.site/43823586ec4dc3b059f7/SentyWEN.ttf)');
window.onload = function () {
    wzmFont.load().then(font => {
        document.fonts.add(font)
    }).then(() => {
        for (let i = 0; i < 16; ++i)
            for (let j = 0; j < 16; ++j)
                opos.push({ x: PAD + i * W, y: PAD + j * W, color: -1 });

        c.onmousemove = function (event) {
            //console.log(playing);
            if (playing) {
                let e = { x: event.offsetX * 2, y: event.offsetY * 2 };
                //console.log('move', e);
                mousePos = e;
                focusPos = undefined;
                for (let o of opos)
                    if (o.color == -1 && Distance(o, e) <= 30)
                        focusPos = o;
                if (focusPos != undefined)
                    mousePos = focusPos;
                //console.log(focusPos);
            }
        };
        /*
                c.onmouseup = function (event) {
                    //    console.log('up', e);
                    mouseDown = false;
                    if (focusPos != undefined)
                        focusPos.color = 0;
                };
        */

        c.onmousedown = function (event) {
            console.log('down');
            if (focusPos != undefined) {
                $.ajax({
                    async: false,
                    url: 'http://47.98.32.107' + '/calcmove',
                    type: 'POST',
                    dataType: 'json',
                    data: { board: opos, which: selfColor ^ 1 },
                    success: (resp) => {
                        chance = resp.chance;
                        setInterval(() => {
                            let x = parseInt(scoreBanner.innerHTML);
                            if (x == chance)
                                clearInterval();
                            else
                                scoreBanner.innerHTML = x + (x < chance ? 1 : -1);
                        }, 10);

                        choicePos = focusPos;
                        choicePos.color = 0;
                        choicePos.scaleAnimation = {
                            st: Date.now(),
                            Progress: () => {
                                let p = (Date.now() - choicePos.scaleAnimation.st) / 50;
                                if (p > 1) {
                                    p = 1;
                                    choicePos.scaleAnimation = undefined;
                                    soundPlayer.play();
                                    Win([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }]);
                                    if ()
                                }
                                return p;
                            }
                        };

                        movingOPos = focusPos = mousePos = undefined;
                        playing = false;//FIXME
                    },
                    error: (resp) => {
                        console.log('error', resp);
                    }
                });
                setTimeout(() => {
                    let i = Math.trunc(Math.random() * opos.length);
                    while (opos[i].color != -1)
                        i = Math.trunc(Math.random() * opos.length);

                    choicePos = opos[i];
                    movingAdv = { x: 0, y: 0 };
                }, 2000);
            }
        };

        PlayBegin();
        Main();
    });
};