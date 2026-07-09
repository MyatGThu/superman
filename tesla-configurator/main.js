import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createEnvironment } from './environment.js';
import { createModelY } from './car.js';

const canvas = document.getElementById('scene');
const loading = document.getElementById('loading');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
	renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch {
	loading.innerHTML = '';
	const note = document.createElement('div');
	note.className = 'no-webgl-note';
	note.innerHTML = '<p>This tour needs WebGL, which your browser has turned off.<br>The Model Y remains parked in the Sea of Tranquility.</p>';
	document.body.appendChild(note);
	throw new Error('WebGL unavailable');
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020204);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 2000);
camera.position.set(5.6, 2.2, 6.8);

const controls = new OrbitControls(camera, canvas);
controls.enabled = false;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.enableZoom = false; // wheel must keep scrolling the page
controls.minPolarAngle = 0.15;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(0, 0.75, 0);

const env = createEnvironment();
scene.add(env.group);

const car = await createModelY();
scene.add(car.group);
loading.classList.add('done');

// ---------- camera path ----------
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const KF = [
	{ pos: V(6.6, 2.3, 8.0), tgt: V(0, 1.3, 0), fov: 36 },        // 0 hero: sky-dominant, car in the bottom third
	{ pos: V(9.3, 1.2, 1.65), tgt: V(0, 0.8, 1.35), fov: 32 },    // 1 full side profile right of the panel
	{ pos: V(2.9, 1.9, -6.15), tgt: V(-0.5, 0.85, -1.45), fov: 36 },// 2 rear three-quarter, hatch clear of the panel
	{ pos: car.interiorEye, tgt: car.interiorTarget, fov: 62 },   // 3 driver's seat
	{ pos: V(2.5, 1.5, -1.3), tgt: V(1.1, 1.0, -1.7), fov: 46 },  // 4 exit via rear quarter
	{ pos: V(2.35, 1.2, -4.05), tgt: V(0.5, 1.0, -2.3), fov: 40 },// 5 charge port
	{ pos: V(6.4, 2.4, 6.6), tgt: V(-0.7, 0.55, 0), fov: 36 },    // 6 explore: car left, dock clear
];
const SECTION_KF = [0, 1, 2, 3, 5, 6]; // keyframe index at each section's center

const sections = [...document.querySelectorAll('.fold')];
let anchors = [];
function computeAnchors() {
	anchors = sections.map((el) => el.offsetTop + el.offsetHeight / 2);
}

// Keyframe FOVs are framed for a 1.6 landscape aspect. On narrower viewports
// keep the HORIZONTAL field of view constant instead, so the car never
// overflows into the copy on portrait phones.
const DESIGN_ASPECT = 1.6;
const RAD = Math.PI / 180;
function aspectFov(fovDeg) {
	if (camera.aspect >= DESIGN_ASPECT) return fovDeg;
	const hFov = 2 * Math.atan(Math.tan((fovDeg * RAD) / 2) * DESIGN_ASPECT);
	return (2 * Math.atan(Math.tan(hFov / 2) / camera.aspect)) / RAD;
}

const smoothstep = (f) => f * f * (3 - 2 * f);

function pathT() {
	const vc = window.scrollY + window.innerHeight / 2;
	if (vc <= anchors[0]) return SECTION_KF[0];
	for (let i = 0; i < anchors.length - 1; i++) {
		if (vc < anchors[i + 1]) {
			const f = (vc - anchors[i]) / (anchors[i + 1] - anchors[i]);
			return SECTION_KF[i] + smoothstep(f) * (SECTION_KF[i + 1] - SECTION_KF[i]);
		}
	}
	return SECTION_KF[SECTION_KF.length - 1];
}

// ---------- tour state (scroll-driven, reversible) ----------
const ui = {
	doors: document.querySelector('[data-action="doors"]'),
	frunk: document.querySelector('[data-action="frunk"]'),
	liftgate: document.querySelector('[data-action="liftgate"]'),
	chargePort: document.querySelector('[data-action="chargePort"]'),
	lights: document.querySelector('[data-action="lights"]'),
	interior: document.querySelector('[data-action="interior"]'),
};

let exploring = false;
let interiorView = false;

function setPressed(btn, on) {
	btn.setAttribute('aria-pressed', String(on));
}

function applyTourState(t) {
	const hatchOpen = t > 1.55 && t < 3.35;
	car.hinges.liftgate.set(hatchOpen);
	car.hinges.frunk.set(hatchOpen);
	const night = t > 4.25 && t < 5.75;
	if (car.lightsOn !== night) car.setLights(night);
	car.setChargePort(night);
}

function enterExplore() {
	exploring = true;
	controls.enabled = !interiorView;
	['liftgate', 'frunk'].forEach((h) => car.hinges[h].set(false));
	car.setLights(false);
	car.setChargePort(false);
	Object.values(ui).forEach((b) => { if (b !== ui.interior) setPressed(b, false); });
	// a fast jump (or reduced motion) can land here mid-path — snap to the
	// explore framing rather than orbiting from wherever the camera was left
	if (camera.position.distanceTo(KF[6].pos) > 1.5) {
		camera.position.copy(KF[6].pos);
		controls.target.copy(KF[6].tgt);
		camera.fov = aspectFov(KF[6].fov);
		camera.updateProjectionMatrix();
	}
}

function leaveExplore() {
	exploring = false;
	interiorView = false;
	controls.enabled = false;
	ui.interior.textContent = 'Step inside';
	['doorFL', 'doorFR', 'doorRL', 'doorRR'].forEach((d) => car.hinges[d].set(false));
}

// ---------- render loop ----------
const clock = new THREE.Clock();
let smoothT = 0;
const heroCopy = document.querySelector('.hero-copy');

function frame() {
	requestAnimationFrame(frame);
	const dt = Math.min(clock.getDelta(), 0.1);
	const t = pathT();
	smoothT = reducedMotion ? t : smoothT + (t - smoothT) * Math.min(1, dt * 4.2);

	const wasExploring = exploring;
	if (smoothT > 5.82 && !wasExploring) enterExplore();
	if (smoothT <= 5.82 && wasExploring) leaveExplore();

	if (!exploring) {
		applyTourState(smoothT);
		const s = Math.min(Math.floor(smoothT), KF.length - 2);
		const f = smoothT - s;
		camera.position.lerpVectors(KF[s].pos, KF[s + 1].pos, f);
		controls.target.lerpVectors(KF[s].tgt, KF[s + 1].tgt, f);
		camera.fov = aspectFov(KF[s].fov + (KF[s + 1].fov - KF[s].fov) * f);
		// gentle drift while parked on the hero fold
		if (!reducedMotion && smoothT < 0.5) {
			const drift = clock.elapsedTime * 0.05;
			camera.position.x += Math.sin(drift) * 0.25 * (1 - smoothT * 2);
			camera.position.z += Math.cos(drift * 0.7) * 0.2 * (1 - smoothT * 2);
		}
		camera.updateProjectionMatrix();
		camera.lookAt(controls.target);
	} else if (interiorView) {
		camera.position.lerp(car.interiorEye, Math.min(1, dt * 4));
		controls.target.lerp(car.interiorTarget, Math.min(1, dt * 4));
		camera.fov += (aspectFov(62) - camera.fov) * Math.min(1, dt * 4);
		camera.updateProjectionMatrix();
		camera.lookAt(controls.target);
	} else {
		camera.fov += (aspectFov(38) - camera.fov) * Math.min(1, dt * 4);
		camera.updateProjectionMatrix();
		controls.update();
	}

	// hero parallax: headline drifts slower than the page
	if (!reducedMotion && window.scrollY < window.innerHeight * 1.5) {
		const y = window.scrollY;
		heroCopy.style.transform = `translateY(calc(var(--hero-offset) + ${y * 0.3}px))`;
		heroCopy.style.opacity = String(Math.max(0, 1 - y / (window.innerHeight * 0.55)));
	}

	car.update(dt);
	env.update(dt);
	renderer.render(scene, camera);
}

// ---------- explore dock ----------
ui.doors.addEventListener('click', () => {
	const open = !car.hinges.doorFL.isOpen;
	['doorFL', 'doorFR', 'doorRL', 'doorRR'].forEach((d) => car.hinges[d].set(open));
	setPressed(ui.doors, open);
});
for (const key of ['frunk', 'liftgate']) {
	ui[key].addEventListener('click', () => {
		car.hinges[key].toggle();
		setPressed(ui[key], car.hinges[key].isOpen);
	});
}
ui.chargePort.addEventListener('click', () => {
	const on = ui.chargePort.getAttribute('aria-pressed') !== 'true';
	car.setChargePort(on);
	setPressed(ui.chargePort, on);
});
ui.lights.addEventListener('click', () => {
	const on = !car.lightsOn;
	car.setLights(on);
	setPressed(ui.lights, on);
});
ui.interior.addEventListener('click', () => {
	interiorView = !interiorView;
	controls.enabled = exploring && !interiorView;
	ui.interior.textContent = interiorView ? 'Step outside' : 'Step inside';
	if (!interiorView && exploring) {
		// hand the camera back to orbit from the explore keyframe
		camera.position.copy(KF[6].pos);
		controls.target.copy(KF[6].tgt);
	}
});

document.querySelectorAll('.swatch').forEach((btn) => {
	btn.addEventListener('click', () => {
		document.querySelectorAll('.swatch').forEach((s) => {
			s.classList.remove('is-active');
			s.setAttribute('aria-checked', 'false');
		});
		btn.classList.add('is-active');
		btn.setAttribute('aria-checked', 'true');
		car.setPaint(car.colors[btn.dataset.paint]);
	});
});

// keyboard orbit for the explore fold (arrow keys)
window.addEventListener('keydown', (e) => {
	if (!exploring || interiorView) return;
	if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
	if (document.activeElement && ['BUTTON', 'A', 'INPUT'].includes(document.activeElement.tagName)) return;
	e.preventDefault();
	const offset = camera.position.clone().sub(controls.target);
	const sph = new THREE.Spherical().setFromVector3(offset);
	if (e.key === 'ArrowLeft') sph.theta += 0.12;
	if (e.key === 'ArrowRight') sph.theta -= 0.12;
	if (e.key === 'ArrowUp') sph.phi = Math.max(0.2, sph.phi - 0.08);
	if (e.key === 'ArrowDown') sph.phi = Math.min(Math.PI * 0.49, sph.phi + 0.08);
	camera.position.copy(controls.target).add(offset.setFromSpherical(sph));
	camera.lookAt(controls.target);
});

// ---------- waypoint rail ----------
const railDots = [...document.querySelectorAll('[data-rail]')];
function updateRail() {
	const vc = window.scrollY + window.innerHeight / 2;
	let active = 0;
	sections.forEach((el, i) => {
		if (vc >= el.offsetTop) active = i;
	});
	railDots.forEach((d, i) => {
		d.classList.toggle('is-active', i === active);
		if (i === active) d.setAttribute('aria-current', 'true');
		else d.removeAttribute('aria-current');
	});
}
window.addEventListener('scroll', updateRail, { passive: true });

// ---------- panel reveals (visible by default; JS adds the settle) ----------
if (!reducedMotion && 'IntersectionObserver' in window) {
	const revealables = document.querySelectorAll('.panel, .explore-head, .dock');
	const io = new IntersectionObserver((entries) => {
		entries.forEach((e) => {
			if (e.isIntersecting) {
				e.target.classList.remove('will-reveal');
				io.unobserve(e.target);
			}
		});
	}, { threshold: 0.25 });
	revealables.forEach((el) => {
		if (el.getBoundingClientRect().top > window.innerHeight) {
			el.classList.add('will-reveal');
			io.observe(el);
		}
	});
}

// ---------- sizing ----------
function resize() {
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	computeAnchors();
}
window.addEventListener('resize', resize, { passive: true });
resize();
if (document.fonts?.ready) document.fonts.ready.then(computeAnchors);
window.addEventListener('load', computeAnchors);

updateRail();
frame();

// test hook (harmless in production, load-bearing for automated checks)
window.__page = {
	camera, controls, car, env,
	get t() { return pathT(); },
	get smoothT() { return smoothT; },
	get exploring() { return exploring; },
};
