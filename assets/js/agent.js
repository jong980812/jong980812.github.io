// Video Agent: a small floating robot (same look as the robot arm in the 3D office)
// that follows the pointer, trailed by a few video frames. It watches the front
// frame and types a one-line caption of what it understands.
//   - wide screens: fixed in the right margin, follows the pointer's height
//   - narrower screens: docked in the hero, follows the pointer inside the hero
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/+esm';
import { RoundedBoxGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/geometries/RoundedBoxGeometry.js/+esm';

const root = document.getElementById('agent');
const canvas = root.querySelector('canvas');
const cap = root.querySelector('.agent-cap');
const nameTag = root.querySelector('.agent-name');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const marginMode = matchMedia('(min-width: 1420px)');

let renderer;
try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (e) {
    root.hidden = true;
    throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
scene.add(new THREE.HemisphereLight(0xffffff, 0xcfd6e0, 2.1));
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(-2, 4, 5);
scene.add(key);

// ------------------------------------------------------------- robot
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, ...o });
const white = std(0xf6f7f9), coral = std(0xe2574c, { roughness: 0.5 }), navy = std(0x0f2a52, { roughness: 0.35 });
const glow = new THREE.MeshBasicMaterial({ color: 0x5fd4ff });
const rbox = (w, h, d, r, m) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), m);
const put = (parent, mesh, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); parent.add(mesh); return mesh; };

const robot = new THREE.Group();
scene.add(robot);
const bodyG = put(robot, new THREE.Group());
put(bodyG, rbox(0.46, 0.44, 0.4, 0.17, white), 0, -0.3);
put(bodyG, rbox(0.24, 0.06, 0.02, 0.02, navy), 0, -0.26, 0.2);
put(bodyG, new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), glow), 0.05, -0.26, 0.215);
const ring = put(robot, new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 8, 40), new THREE.MeshBasicMaterial({ color: 0x5fd4ff, transparent: true, opacity: 0.45 })), 0, -0.62);
ring.rotation.x = Math.PI / 2;

const arm = put(bodyG, new THREE.Group(), 0.26, -0.2);           // the arm that points at the front frame
put(arm, new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), coral));
put(arm, rbox(0.07, 0.24, 0.07, 0.03, white), 0, -0.13);
put(arm, new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), coral), 0, -0.26);
const arm2 = put(bodyG, new THREE.Group(), -0.26, -0.2);
put(arm2, new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), coral));
put(arm2, rbox(0.07, 0.22, 0.07, 0.03, white), 0, -0.12);
arm2.rotation.z = -0.25;

const head = put(robot, new THREE.Group(), 0, 0.12);
put(head, rbox(0.62, 0.46, 0.48, 0.19, white));
put(head, rbox(0.5, 0.31, 0.04, 0.12, navy), 0, -0.01, 0.235);
const eye = put(head, new THREE.Mesh(new THREE.CircleGeometry(0.055, 32), glow), 0, -0.01, 0.258);
const eyeGlow = put(head, new THREE.Mesh(new THREE.CircleGeometry(0.09, 32), new THREE.MeshBasicMaterial({ color: 0x5fd4ff, transparent: true, opacity: 0.18 })), 0, -0.01, 0.256);
[-1, 1].forEach(s => { const e = put(head, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 24), coral), s * 0.33, 0); e.rotation.z = Math.PI / 2; });
put(head, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), navy), 0, 0.3);
put(head, new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), coral), 0, 0.39);

// ------------------------------------------------------------- frames (little 2D clips drawn on canvases)
const FW = 384, FH = 240;
const INK = '#141A22', SOFT = '#B9C0CB', BALL = '#E5533D';
const line = (g, pts, w = 3, c = INK) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); };
const dot = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
const ground = (g, y) => line(g, [[0, y], [FW, y]], 3, SOFT);
const tree = (g, x, y, r) => { line(g, [[x, y], [x, y - 30]], 4); g.fillStyle = '#B9CFAE'; g.beginPath(); g.arc(x, y - 42, r, 0, 7); g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); };
const hills = (g, pts) => { g.fillStyle = '#DCE3EC'; g.beginPath(); g.moveTo(0, FH); pts.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(FW, FH); g.fill(); };
const stick = (g, x, y, ph) => {
    dot(g, x, y - 92, 11, '#fff'); g.lineWidth = 4; g.strokeStyle = INK; g.beginPath(); g.arc(x, y - 92, 11, 0, 7); g.stroke();
    const s = Math.sin(ph) * 16;
    line(g, [[x, y - 80], [x, y - 40]], 4);
    line(g, [[x, y - 40], [x + s, y]], 4); line(g, [[x, y - 40], [x - s, y]], 4);
    line(g, [[x, y - 70], [x - s * 0.8, y - 46]], 4); line(g, [[x, y - 70], [x + s * 0.8, y - 46]], 4);
};
const SCENES = [
    { cap: 'ball · rolls down, bounces', draw(g, t) {
        ground(g, FH - 24); line(g, [[20, 60], [220, 180], [244, 152], [268, FH - 24]], 5);
        const p = (t % 2.6) / 2.6; let x, y;
        if (p < 0.5) { const u = p / 0.5; x = 40 + 170 * u * u; y = 52 + 100 * u * u; }
        else { const u = (p - 0.5) / 0.5; x = 210 + 120 * u; y = 152 - 120 * 4 * u * (1 - u) * 0.8 + 50 * u * u; }
        dot(g, x, y, 16, BALL);
    } },
    { cap: 'car · moving right', draw(g, t) {
        hills(g, [[0, 150], [60, 90], [110, 120], [180, 60], [250, 140], [300, 100], [384, 150]]);
        ground(g, FH - 36); tree(g, 70, FH - 40, 20); tree(g, 300, FH - 40, 16);
        const x = -100 + ((t % 4) / 4) * 520, y = FH - 46;
        g.fillStyle = '#6F8FD6'; g.strokeStyle = INK; g.lineWidth = 4; g.beginPath();
        g.moveTo(x, y); g.lineTo(x, y - 24); g.lineTo(x + 20, y - 24); g.lineTo(x + 34, y - 44); g.lineTo(x + 64, y - 44); g.lineTo(x + 78, y - 24); g.lineTo(x + 92, y - 24); g.lineTo(x + 92, y); g.closePath(); g.fill(); g.stroke();
        dot(g, x + 20, y + 4, 10, INK); dot(g, x + 72, y + 4, 10, INK);
    } },
    { cap: 'person · walking', draw(g, t) {
        ground(g, FH - 24); tree(g, 240, FH - 24, 30);
        stick(g, -30 + ((t % 6) / 6) * 460, FH - 24, t * 7);
    } },
    { cap: 'ball · hidden, still there', draw(g, t) {
        ground(g, FH - 30);
        const p = Math.min(1, (t % 4) / 3.2);
        dot(g, 30 + p * 170, FH - 48, 18, BALL);
        g.fillStyle = '#EFE6D2'; g.fillRect(160, 96, 92, FH - 126); g.lineWidth = 4; g.strokeStyle = INK; g.strokeRect(160, 96, 92, FH - 126);
        if (p >= 1) { g.setLineDash([6, 8]); g.strokeStyle = '#5FA8FF'; g.lineWidth = 3; g.beginPath(); g.arc(214, FH - 48, 18, 0, 7); g.stroke(); g.setLineDash([]); }
    } },
    { cap: 'pendulum · swinging', draw(g, t) {
        line(g, [[140, 24], [244, 24]], 5);
        const a = Math.sin(t * 2.6) * 0.65, L = 150, x = 192 + Math.sin(a) * L, y = 24 + Math.cos(a) * L;
        line(g, [[192, 24], [x, y]], 4); dot(g, x, y, 18, BALL);
    } },
    { cap: 'bird · flying over the hills', draw(g, t) {
        dot(g, 300, 54, 24, '#FFD98A');
        hills(g, [[0, 190], [80, 110], [140, 150], [210, 80], [290, 170], [340, 140], [384, 170]]);
        const p = (t % 5) / 5, x = -30 + p * 450, y = 120 - p * 60, f = Math.sin(t * 12) * 10;
        line(g, [[x - 20, y - f], [x, y], [x + 20, y - f]], 4);
    } },
];

const frames = [];
const N_FRAMES = 4;
for (let i = 0; i < N_FRAMES; i++) {
    const c = document.createElement('canvas'); c.width = FW; c.height = FH;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const g = new THREE.Group();
    const back = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 0.68), new THREE.MeshBasicMaterial({ color: 0x141a22, transparent: true }));
    back.position.z = -0.005; g.add(back);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.625), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    g.add(pic);
    scene.add(g);
    frames.push({ g, c, ctx: c.getContext('2d'), tex, mats: [back.material, pic.material], scene: 0, pos: new THREE.Vector3() });
}

// ------------------------------------------------------------- layout
let mode = '';
let worldH = 3, worldW = 4;
function layout() {
    mode = marginMode.matches ? 'margin' : 'dock';
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    worldH = mode === 'margin' ? 6 : 3.1;
    worldW = worldH * camera.aspect;
    camera.position.set(0, 0, (worldH / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
}
new ResizeObserver(layout).observe(canvas);
marginMode.addEventListener('change', layout);
layout();

// pointer → target position for the robot, inside its own canvas area
const pointer = { x: 0.5, y: 0.35, moved: false };
addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    if (mode === 'margin') {
        pointer.y = THREE.MathUtils.clamp((e.clientY - r.top) / r.height, 0, 1);
        pointer.x = 0.5;
    } else {
        pointer.x = THREE.MathUtils.clamp((e.clientX - r.left) / r.width, 0, 1);
        pointer.y = THREE.MathUtils.clamp((e.clientY - r.top) / r.height, 0, 1);
    }
    pointer.moved = true;
}, { passive: true });

// ------------------------------------------------------------- caption typing
let current = 0, typed = 0, nextSwap = 4.5;   // index of the clip at the front
function typeCaption() {
    const full = SCENES[current].cap;
    typed = Math.min(full.length, typed + 1);
    cap.textContent = full.slice(0, typed);
    cap.classList.toggle('typing', typed < full.length);
}

// ------------------------------------------------------------- loop
const robotPos = new THREE.Vector3(), tmp = new THREE.Vector3(), lookTarget = new THREE.Vector3();
const clock = new THREE.Clock();
let typeClock = 0, visible = true;
new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(canvas);

function targetFor(t) {
    if (mode === 'margin') {
        const y = THREE.MathUtils.lerp(worldH / 2 - 0.8, -worldH / 2 + 3.6, pointer.y);
        return tmp.set(Math.sin(t * 0.7) * 0.12, y + Math.sin(t * 1.6) * 0.05, 0);
    }
    const x = THREE.MathUtils.lerp(-worldW / 2 + 0.55, -worldW / 2 + 1.4, pointer.x);
    const y = THREE.MathUtils.lerp(0.75, -0.55, pointer.y);
    return tmp.set(x, y + Math.sin(t * 1.6) * 0.05, 0);
}
function slot(i) {                       // where frame i wants to sit, relative to the robot
    return mode === 'margin'
        ? new THREE.Vector3((i % 2 ? -0.14 : 0.14), -0.98 - i * 0.92, 0)
        : new THREE.Vector3(0.98 + i * 0.86, 0.12 + (i % 2 ? -0.08 : 0.08), 0);
}

function frame(dt, t) {
    robotPos.lerp(targetFor(t), 1 - Math.pow(0.02, dt));
    robot.position.copy(robotPos);

    // frames trail the robot one after another, each chasing the one before it
    frames.forEach((f, i) => {
        const goal = (i === 0 ? robotPos : frames[i - 1].pos).clone().add(i === 0 ? slot(0) : slot(i).sub(slot(i - 1)));
        f.pos.lerp(goal, 1 - Math.pow(i === 0 ? 0.01 : 0.03, dt));
        f.g.position.copy(f.pos);
        const s = 1 - i * 0.12;
        f.g.scale.setScalar(s * (f.pop ?? 1));
        f.mats.forEach(m => { m.opacity = 1 - i * 0.24; });
        f.ctx.fillStyle = '#fff'; f.ctx.fillRect(0, 0, FW, FH);
        SCENES[f.scene].draw(f.ctx, t + i * 1.3);
        f.tex.needsUpdate = true;
        if (f.pop !== undefined) { f.pop = Math.min(1, f.pop + dt * 3); if (f.pop >= 1) delete f.pop; }
    });

    // the robot watches the front frame; its body leans toward where it is going
    lookTarget.copy(frames[0].pos);
    const d = lookTarget.clone().sub(robotPos);
    head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, THREE.MathUtils.clamp(d.x * 0.5, -0.6, 0.6), 0.1);
    head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, THREE.MathUtils.clamp(-d.y * 0.35, -0.45, 0.35), 0.1);
    eye.position.x = eyeGlow.position.x = THREE.MathUtils.clamp(d.x * 0.08, -0.14, 0.14);
    eye.position.y = eyeGlow.position.y = -0.01 + THREE.MathUtils.clamp(d.y * 0.05, -0.07, 0.07);
    const blink = (t % 4.2) < 0.12 ? 0.15 : 1;
    eye.scale.y = THREE.MathUtils.lerp(eye.scale.y, blink, 0.5);
    arm.rotation.z = THREE.MathUtils.lerp(arm.rotation.z, Math.atan2(d.x, -d.y) * 0.7, 0.08);
    ring.material.opacity = 0.35 + Math.sin(t * 2) * 0.1;

    // every few seconds the next clip arrives at the front and the robot captions it
    if (t > nextSwap) {
        nextSwap = t + 4.5;
        current = (current + 1) % SCENES.length;
        frames.forEach((f, i) => { f.scene = (current - i + SCENES.length * 4) % SCENES.length; });
        frames[0].pop = 0.6;
        typed = 0;
    }
    typeClock += dt;
    if (typeClock > 0.045) { typeClock = 0; typeCaption(); }

    // caption sits under the front frame
    const p = frames[0].pos.clone().add(new THREE.Vector3(0, -0.42, 0)).project(camera);
    cap.style.transform = `translate(${(p.x * 0.5 + 0.5) * canvas.clientWidth}px, ${(-p.y * 0.5 + 0.5) * canvas.clientHeight}px) translateX(-50%)`;

    // name tag floats just above the antenna
    const q = robotPos.clone().add(new THREE.Vector3(0, 0.62, 0)).project(camera);
    nameTag.style.transform = `translate(${(q.x * 0.5 + 0.5) * canvas.clientWidth}px, ${(-q.y * 0.5 + 0.5) * canvas.clientHeight}px) translate(-50%, -100%)`;

    renderer.render(scene, camera);
}

frames.forEach((f, i) => { f.scene = (SCENES.length - i) % SCENES.length; });
robotPos.copy(targetFor(0));
frames.forEach((f, i) => f.pos.copy(robotPos).add(mode === 'margin' ? new THREE.Vector3(0, -0.98 - i * 0.92, 0) : new THREE.Vector3(0.98 + i * 0.86, 0.1, 0)));
root.classList.add('ready');

if (reduceMotion) {
    typed = 999;
    frame(0.016, 2);
    new ResizeObserver(() => frame(0.016, 2)).observe(canvas);
} else {
    renderer.setAnimationLoop(() => {
        const dt = Math.min(clock.getDelta(), 0.05);
        if (visible) frame(dt, clock.elapsedTime);
    });
}
