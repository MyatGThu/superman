import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createCar } from './car.js';

const canvas = document.getElementById('scene');
const stage = document.getElementById('viewer-stage');
const loadingOverlay = document.getElementById('loading-overlay');
const heroCopy = document.querySelector('.hero-copy');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0c0d);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const EXTERIOR_FOV = 35;
const INTERIOR_FOV = 78;
const camera = new THREE.PerspectiveCamera(EXTERIOR_FOV, 1, 0.05, 100);
const DEFAULT_POS = new THREE.Vector3(4.6, 2.05, 5.1);
const DEFAULT_TARGET = new THREE.Vector3(0, 0.75, 0);
camera.position.copy(DEFAULT_POS);

const controls = new OrbitControls(camera, canvas);
controls.target.copy(DEFAULT_TARGET);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.9;
controls.minDistance = 3;
controls.maxDistance = 9;
controls.maxPolarAngle = Math.PI * 0.49;
controls.enablePan = false;
controls.update();

const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 0.55);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(5, 8, 3);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -5;
key.shadow.camera.right = 5;
key.shadow.camera.top = 5;
key.shadow.camera.bottom = -5;
key.shadow.bias = -0.0003;
scene.add(key);

const fill = new THREE.DirectionalLight(0xbcd4ff, 0.5);
fill.position.set(-6, 3, -4);
scene.add(fill);

const ground = new THREE.Mesh(
	new THREE.CircleGeometry(14, 64),
	new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const car = createCar();
scene.add(car.group);

function resize() {
	const { clientWidth, clientHeight } = stage;
	renderer.setSize(clientWidth, clientHeight);
	camera.aspect = clientWidth / clientHeight;
	camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

let transition = null;
function startTransition(toPos, toTarget, toFov = camera.fov, duration = 950) {
	transition = {
		fromPos: camera.position.clone(),
		toPos: toPos.clone(),
		fromTarget: controls.target.clone(),
		toTarget: toTarget.clone(),
		fromFov: camera.fov,
		toFov,
		t0: performance.now(),
		duration,
	};
	controls.enabled = false;
}

function easeInOutCubic(t) {
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const clock = new THREE.Clock();

function animate() {
	requestAnimationFrame(animate);
	const dt = clock.getDelta();

	if (transition) {
		const t = Math.min(1, (performance.now() - transition.t0) / transition.duration);
		const e = easeInOutCubic(t);
		camera.position.lerpVectors(transition.fromPos, transition.toPos, e);
		controls.target.lerpVectors(transition.fromTarget, transition.toTarget, e);
		camera.fov = transition.fromFov + (transition.toFov - transition.fromFov) * e;
		camera.updateProjectionMatrix();
		if (t >= 1) {
			transition = null;
			controls.enabled = true;
		}
	}

	car.update(dt);
	controls.update();
	renderer.render(scene, camera);
}
animate();

requestAnimationFrame(() => {
	requestAnimationFrame(() => {
		setTimeout(() => loadingOverlay.classList.add('hidden'), 250);
	});
});

canvas.addEventListener('pointerdown', () => heroCopy.classList.add('faded'), { once: true });

// ---- UI wiring ----
let interiorMode = false;
let doorsOpen = false;
let lightsOn = false;
let chargePortOpen = false;

const interiorBtn = document.querySelector('[data-action="interior"]');

function setInteriorMode(next) {
	interiorMode = next;
	if (interiorMode) {
		controls.autoRotate = false;
		controls.minDistance = 0.05;
		controls.maxDistance = 1.2;
		startTransition(car.interiorEye, car.interiorTarget, INTERIOR_FOV);
		car.setShellVisible(false);
		interiorBtn.textContent = 'Exit Interior';
		interiorBtn.classList.add('active');
	} else {
		controls.minDistance = 3;
		controls.maxDistance = 9;
		startTransition(DEFAULT_POS, DEFAULT_TARGET, EXTERIOR_FOV);
		car.setShellVisible(true);
		interiorBtn.textContent = 'View Interior';
		interiorBtn.classList.remove('active');
	}
	heroCopy.classList.add('faded');
}

document.getElementById('button-row').addEventListener('click', (e) => {
	const btn = e.target.closest('.ctrl');
	if (!btn) return;
	const action = btn.dataset.action;

	switch (action) {
		case 'doors':
			doorsOpen = !doorsOpen;
			['doorFL', 'doorFR', 'doorRL', 'doorRR'].forEach((id) => car.hinges[id].set(doorsOpen));
			btn.classList.toggle('active', doorsOpen);
			btn.textContent = doorsOpen ? 'Close Doors' : 'Doors';
			break;
		case 'frunk':
			car.hinges.frunk.toggle();
			btn.classList.toggle('active', car.hinges.frunk.isOpen);
			btn.textContent = car.hinges.frunk.isOpen ? 'Close Frunk' : 'Frunk';
			break;
		case 'trunk':
			car.hinges.trunk.toggle();
			btn.classList.toggle('active', car.hinges.trunk.isOpen);
			btn.textContent = car.hinges.trunk.isOpen ? 'Close Trunk' : 'Trunk';
			break;
		case 'chargePort':
			chargePortOpen = !chargePortOpen;
			car.setChargePort(chargePortOpen);
			btn.classList.toggle('active', chargePortOpen);
			btn.textContent = chargePortOpen ? 'Close Port' : 'Charge Port';
			break;
		case 'lights':
			lightsOn = !lightsOn;
			car.setLights(lightsOn);
			btn.classList.toggle('active', lightsOn);
			break;
		case 'interior':
			setInteriorMode(!interiorMode);
			break;
		case 'reset':
			if (interiorMode) setInteriorMode(false);
			else startTransition(DEFAULT_POS, DEFAULT_TARGET);
			controls.autoRotate = true;
			break;
	}
});

document.getElementById('color-row').addEventListener('click', (e) => {
	const btn = e.target.closest('.swatch');
	if (!btn) return;
	document.querySelectorAll('.swatch').forEach((s) => {
		s.classList.remove('active');
		s.setAttribute('aria-pressed', 'false');
	});
	btn.classList.add('active');
	btn.setAttribute('aria-pressed', 'true');
	car.setPaint(car.colors[btn.dataset.color]);
});

canvas.addEventListener('pointerdown', () => {
	controls.autoRotate = false;
});
