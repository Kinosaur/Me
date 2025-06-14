let canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let W = window.innerWidth;
let H = window.innerHeight;
canvas.width = W;
canvas.height = H;

// Helper Functions
function mid() {
    const args = Array.from(arguments);
    if (args.length < 3) return args[0] || 0;
    const sorted = args.slice().sort((a, b) => a - b);
    return sorted[Math.round((sorted.length - 1) / 2)];
}

const PY = (x, y) =>
    Math.sqrt(Math.pow(Math.abs(x), 2) + Math.pow(Math.abs(y), 2));

const fpsHelper = function (onSecond) {
    let lastSec = Date.now();
    let frames = 0;
    let fps = 0;
    return {
        onFrame: () => {
            if (Date.now() - lastSec > 1000) {
                lastSec = Date.now();
                fps = frames;
                frames = 0;
                if (onSecond) onSecond(fps);
            } else {
                frames += 1;
            }
        },
        getFPS: () => {
            return fps;
        },
    };
};

const mouse = {
    x: W / 2,
    y: H / 2,
};

const config = {
    nPoints: 20,
    nLines: 20,
    radius: 100,
    padding: 40,
    showFPS: false,
    showPoints: false,
    maxSpeed: 30,
};

window.onload = function () {
    var gui = new dat.GUI({ closed: true, name: "config" });
    gui
        .add(config, "nPoints", 3, 50)
        .step(1)
        .onFinishChange(function (val) {
            debouncedInit();
        });
    gui
        .add(config, "nLines", 3, 50)
        .step(1)
        .onFinishChange(function (val) {
            debouncedInit();
        });
    gui.add(config, "radius", 50, 300).step(1);
    gui
        .add(config, "padding", 5, 45)
        .step(1)
        .onFinishChange(function (val) {
            debouncedUpdateX();
        });
    gui.add(config, "showFPS");
    gui.add(config, "showPoints");
    gui.add(config, "maxSpeed", 5, 100);
};

let lines = [];
let homesX = [];
let homesY = [];
let fpsObj = fpsHelper();
let rAF = null;

function updateLine(line, homeY) {
    let point, desiredX, desiredY, desiredH, desiredForce, desiredAngle,
        hvx, hvy, mvx, mvy, x, y, homeX, vx, vy;
    let radius = config.radius;
    let maxSpeed = config.maxSpeed;
    for (let j = line.length - 1; j >= 0; j--) {
        point = line[j];
        x = point.x;
        y = point.y;
        hvx = 0;
        hvy = 0;
        // Home forces
        homeX = homesX[j];
        if (x !== homeX || y !== homeY) {
            desiredX = homeX - x;
            desiredY = homeY - y;
            desiredH = PY(desiredX, desiredY);
            desiredForce = Math.max(desiredH * 0.2, 1);
            desiredAngle = Math.atan2(desiredY, desiredX);
            hvx = desiredForce * Math.cos(desiredAngle);
            hvy = desiredForce * Math.sin(desiredAngle);
        }
        // Mouse forces
        mvx = 0;
        mvy = 0;
        desiredX = x - mouse.x;
        desiredY = y - mouse.y;
        if (
            !(
                desiredX > radius ||
                desiredY > radius ||
                desiredY < -radius ||
                desiredX < -radius
            )
        ) {
            desiredAngle = Math.atan2(desiredY, desiredX);
            desiredH = PY(desiredX, desiredY);
            desiredForce = Math.max(0, Math.min(radius - desiredH, radius));
            mvx = desiredForce * Math.cos(desiredAngle);
            mvy = desiredForce * Math.sin(desiredAngle);
        }
        vx = Math.round(mid((mvx + hvx) * 0.9, maxSpeed, -maxSpeed));
        vy = Math.round(mid((mvy + hvy) * 0.9, maxSpeed, -maxSpeed));
        if (vx !== 0) {
            point.x += vx;
        }
        if (vy !== 0) {
            point.y += vy;
        }
        line[j] = point;
    }
    return line;
}

function timer() {
    ctx.clearRect(0, 0, W, H);
    if (config.showFPS) {
        fpsObj.onFrame();
        ctx.fillStyle = "#282828";
        ctx.textAlign = "start";
        ctx.textBaseline = "top";
        ctx.font = "50px Helvetica";
        ctx.fillText(fpsObj.getFPS(), 50, 50);
    }
    let line, xc, yc, cur, curX, curY, next, dot;
    for (let i = lines.length - 1; i >= 0; i--) {
        line = updateLine(lines[i], homesY[i]);
        lines[i] = line;
        ctx.beginPath();
        ctx.strokeStyle = "#d2d2d2";
        ctx.moveTo(line[line.length - 1].x, line[line.length - 1].y);
        for (let j = line.length - 2; j > 1; j--) {
            cur = line[j];
            curX = cur.x;
            curY = cur.y;
            next = line[j - 1];
            xc = (curX + next.x) / 2;
            yc = (curY + next.y) / 2;
            ctx.quadraticCurveTo(curX, curY, xc, yc);
        }
        ctx.quadraticCurveTo(line[1].x, line[1].y, line[0].x, line[0].y);
        ctx.stroke();
        if (config.showPoints) {
            for (let j = line.length - 1; j >= 0; j--) {
                dot = line[j];
                ctx.beginPath();
                ctx.fillStyle = "red";
                ctx.arc(dot.x, dot.y, 1, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }
    rAF = requestAnimationFrame(timer);
}

function point(x, y) {
    return {
        x: x,
        y: y,
        hy: y,
        hx: x,
    };
}

function updateX() {
    let calcPad = (W * config.padding) / 100;
    homesX = [];
    for (let i = config.nLines; i >= 0; i--) {
        let x = calcPad + (((W - calcPad * 2) / config.nLines) * i);
        homesX.push(x);
    }
    timer();
}

function init() {
    if (rAF) {
        cancelAnimationFrame(rAF);
        rAF = null;
    }
    lines = [];
    homesX = [];
    homesY = [];
    let calcPad = (W * config.padding) / 100;
    for (let i = config.nLines; i >= 0; i--) {
        let line = [];
        let y = calcPad + (((H - calcPad * 2) / config.nLines) * i);
        homesY.push(y);
        for (let j = config.nPoints; j >= 0; j--) {
            let x = Math.round((W / config.nPoints) * j);
            line.push(point(x, y));
        }
        lines.push(line);
    }
    timer();
}

const debouncedInit = _.debounce(init, 200);
const debouncedUpdateX = _.debounce(updateX, 200);

window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener("resize", (e) => {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    init();
});

init();
