let canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let W = window.innerWidth;
let H = window.innerHeight;
canvas.width = W;
canvas.height = H;

function mid() {
    const args = Array.from(arguments);
    if (args.length < 3) return args[0] || 0;
    const sorted = args.slice().sort((a, b) => a - b);
    return sorted[Math.round((sorted.length - 1) / 2)];
}

const PY = (x, y) =>
    Math.sqrt(x * x + y * y);

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
        getFPS: () => fps,
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
    padding: 10, // Changed from 40 to 10 for better initial spread
    showFPS: false,
    showPoints: false,
    maxSpeed: 30,
};

window.onload = function () {
    var gui = new dat.GUI({ closed: true });
    gui.add(config, "nPoints", 3, 50).step(1).onFinishChange(debouncedInit);
    gui.add(config, "nLines", 3, 50).step(1).onFinishChange(debouncedInit);
    gui.add(config, "radius", 50, 300).step(1);
    gui.add(config, "padding", 5, 45).step(1).onFinishChange(debouncedUpdateX);
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
    let radius = config.radius;
    let maxSpeed = config.maxSpeed;
    for (let j = line.length - 1; j >= 0; j--) {
        let point = line[j];
        let x = point.x;
        let y = point.y;

        // Home force
        let desiredX = homesX[j] - x;
        let desiredY = homeY - y;
        let desiredH = PY(desiredX, desiredY);
        let desiredForce = Math.max(desiredH * 0.2, 1);
        let desiredAngle = Math.atan2(desiredY, desiredX);
        let hvx = desiredForce * Math.cos(desiredAngle);
        let hvy = desiredForce * Math.sin(desiredAngle);

        // Mouse repulsion
        let mvx = 0, mvy = 0;
        let dx = x - mouse.x;
        let dy = y - mouse.y;
        if (Math.abs(dx) < radius && Math.abs(dy) < radius) {
            let dist = PY(dx, dy);
            let force = Math.max(0, Math.min(radius - dist, radius));
            let angle = Math.atan2(dy, dx);
            mvx = force * Math.cos(angle);
            mvy = force * Math.sin(angle);
        }

        // Midpoint velocity clamping
        let vx = Math.round(mid((mvx + hvx) * 0.9, maxSpeed, -maxSpeed));
        let vy = Math.round(mid((mvy + hvy) * 0.9, maxSpeed, -maxSpeed));

        point.x = Math.max(0, Math.min(W, point.x + vx));
        point.y = Math.max(0, Math.min(H, point.y + vy));
    }
    return line;
}

function timer() {
    ctx.clearRect(0, 0, W, H);
    if (config.showFPS) {
        fpsObj.onFrame();
        ctx.fillStyle = "#f8f8f2"; // off-white for FPS
        ctx.textAlign = "start";
        ctx.textBaseline = "top";
        ctx.font = "50px Helvetica";
        ctx.fillText(fpsObj.getFPS(), 50, 50);
    }

    for (let i = lines.length - 1; i >= 0; i--) {
        let line = updateLine(lines[i], homesY[i]);
        lines[i] = line;
        ctx.beginPath();
        ctx.strokeStyle = "#3dd6d0"; // vibrant cyan for lines
        ctx.lineWidth = 2;
        ctx.moveTo(line[line.length - 1].x, line[line.length - 1].y);
        for (let j = line.length - 2; j > 1; j--) {
            let cur = line[j];
            let next = line[j - 1];
            let xc = (cur.x + next.x) / 2;
            let yc = (cur.y + next.y) / 2;
            ctx.quadraticCurveTo(cur.x, cur.y, xc, yc);
        }
        ctx.quadraticCurveTo(line[1].x, line[1].y, line[0].x, line[0].y);
        ctx.stroke();

        if (config.showPoints) {
            for (let j = 0; j < line.length; j++) {
                let dot = line[j];
                ctx.beginPath();
                ctx.fillStyle = "#ffb86c"; // orange accent for points
                ctx.arc(dot.x, dot.y, 2, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }

    rAF = requestAnimationFrame(timer);
}

function point(x, y) {
    return { x: x, y: y };
}

function updateX() {
    let calcPad = (W * config.padding) / 100;
    homesX = [];
    for (let i = config.nPoints; i >= 0; i--) {
        let x = calcPad + (((W - calcPad * 2) / config.nPoints) * i);
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

    // Setup home X positions
    for (let i = config.nPoints; i >= 0; i--) {
        let x = calcPad + (((W - calcPad * 2) / config.nPoints) * i);
        homesX.push(x);
    }

    // Create lines of points
    for (let i = config.nLines; i >= 0; i--) {
        let line = [];
        let y = calcPad + (((H - calcPad * 2) / config.nLines) * i);
        homesY.push(y);
        for (let j = config.nPoints; j >= 0; j--) {
            let x = homesX[j];
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

window.addEventListener("resize", () => {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    init();
});

init();