import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Tesla Model Y — CC-BY-4.0 model "2021 Tesla Model Y" by tonielpro520
// (sketchfab.com/3d-models/2021-tesla-model-y-59e2ead369984b1a85c800ff6cf6789d),
// rigged at runtime: door / hood / liftgate meshes are reparented onto hinge
// pivots, and the merged glass is split into connectivity islands so door
// windows travel with their doors and the rear glass with the liftgate.
// Axes (native to the model): +Z = nose, +Y = up, +X = driver side.

const PAINT = {
	pearlWhite: 0xffffff,
	solidBlack: 0x0d0e10,
	quicksilver: 0x9da2a8,
	deepBlue: 0x16324f,
	ultraRed: 0x7d1a20,
};

class Hinge {
	constructor(pivot, axis, openAngle, speed = 2.6) {
		Object.assign(this, { pivot, axis, openAngle, speed, target: 0, current: 0, isOpen: false });
	}
	set(open) { this.isOpen = open; this.target = open ? this.openAngle : 0; }
	toggle() { this.set(!this.isOpen); }
	update(dt) {
		if (Math.abs(this.target - this.current) < 0.0004) return;
		this.current += (this.target - this.current) * Math.min(1, dt * this.speed);
		this.pivot.rotation[this.axis] = this.current;
	}
}

// Build a standalone geometry from a triangle subset. Pieces must OWN their
// vertices: index-only subsets keep the full position attribute, which makes
// Box3.setFromObject report the whole-mesh bounds and breaks classification.
function subsetGeometry(attributes, triIndices) {
	const remap = new Map();
	const newIndex = [];
	for (const oldI of triIndices) {
		let n = remap.get(oldI);
		if (n === undefined) { n = remap.size; remap.set(oldI, n); }
		newIndex.push(n);
	}
	const g = new THREE.BufferGeometry();
	for (const [name, attr] of Object.entries(attributes)) {
		const itemSize = attr.itemSize;
		const arr = new Float32Array(remap.size * itemSize);
		for (const [oldI, newI] of remap) {
			for (let k = 0; k < itemSize; k++) arr[newI * itemSize + k] = attr.array[oldI * itemSize + k];
		}
		g.setAttribute(name, new THREE.BufferAttribute(arr, itemSize));
	}
	g.setIndex(newIndex);
	return g;
}

// Split a mesh's geometry into connected components, replacing the original.
function splitIslands(mesh) {
	let geo = mesh.geometry;
	const indexed = geo.index ? geo : mergeVertices(geo, 1e-4);
	const welded = mergeVertices(indexed, 1e-4);
	const idx = welded.index.array;
	const vCount = welded.attributes.position.count;
	const parent = new Int32Array(vCount);
	for (let i = 0; i < vCount; i++) parent[i] = i;
	const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
	for (let i = 0; i < idx.length; i += 3) {
		const a = find(idx[i]);
		parent[find(idx[i + 1])] = a;
		parent[find(idx[i + 2])] = a;
	}
	const buckets = new Map();
	for (let i = 0; i < idx.length; i += 3) {
		const root = find(idx[i]);
		let b = buckets.get(root);
		if (!b) buckets.set(root, b = []);
		b.push(idx[i], idx[i + 1], idx[i + 2]);
	}
	if (buckets.size <= 1) return [mesh];

	const out = [];
	for (const tri of buckets.values()) {
		const m = new THREE.Mesh(subsetGeometry(welded.attributes, tri), mesh.material);
		m.castShadow = mesh.castShadow;
		m.applyMatrix4(mesh.matrix);
		out.push(m);
	}
	const p = mesh.parent;
	p.remove(mesh);
	out.forEach((m) => p.add(m));
	return out;
}

function worldCenter(obj) {
	return new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
}

// Cut a mesh into segments along world-Z at the given cut planes, bucketing
// triangles by centroid. Jagged cut edges hide under the pillar trim; this is
// what lets one full-length glass/DLO strip ride two different doors.
function splitAtWorldZ(mesh, cuts) {
	let geo = mesh.geometry.index ? mesh.geometry : mergeVertices(mesh.geometry, 1e-6);
	const idx = geo.index.array;
	const pos = geo.attributes.position;
	mesh.updateWorldMatrix(true, false);
	const m = mesh.matrixWorld;
	const v = new THREE.Vector3();
	const zones = cuts.length + 1;
	const buckets = Array.from({ length: zones }, () => []);
	for (let i = 0; i < idx.length; i += 3) {
		let z = 0;
		for (let k = 0; k < 3; k++) z += v.fromBufferAttribute(pos, idx[i + k]).applyMatrix4(m).z;
		z /= 3;
		let zone = 0;
		while (zone < cuts.length && z < cuts[zone]) zone++;
		buckets[zone].push(idx[i], idx[i + 1], idx[i + 2]);
	}
	const parts = [];
	for (const tri of buckets) {
		if (!tri.length) { parts.push(null); continue; }
		const piece = new THREE.Mesh(subsetGeometry(geo.attributes, tri), mesh.material);
		piece.castShadow = mesh.castShadow;
		piece.applyMatrix4(mesh.matrix);
		parts.push(piece);
	}
	const p = mesh.parent;
	p.remove(mesh);
	parts.forEach((piece) => { if (piece) p.add(piece); });
	return parts;
}

function screenTexture() {
	const canvas = document.createElement('canvas');
	canvas.width = 512; canvas.height = 336;
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = '#0b0d10';
	ctx.fillRect(0, 0, 512, 336);
	ctx.fillStyle = '#101820';
	ctx.fillRect(178, 12, 322, 312);
	ctx.strokeStyle = 'rgba(90,140,200,0.25)';
	for (let i = 0; i < 9; i++) {
		ctx.beginPath(); ctx.moveTo(178 + i * 40, 12); ctx.lineTo(178 + i * 40, 324); ctx.stroke();
		ctx.beginPath(); ctx.moveTo(178, 12 + i * 40); ctx.lineTo(500, 12 + i * 40); ctx.stroke();
	}
	ctx.fillStyle = '#3d9bff';
	ctx.beginPath(); ctx.arc(340, 168, 8, 0, Math.PI * 2); ctx.fill();
	ctx.strokeStyle = '#3d9bff';
	ctx.setLineDash([6, 6]);
	ctx.beginPath(); ctx.moveTo(340, 168); ctx.quadraticCurveTo(420, 100, 470, 40); ctx.stroke();
	ctx.setLineDash([]);
	ctx.fillStyle = '#e8eaee';
	ctx.font = '600 26px system-ui, sans-serif';
	ctx.fillText('100%', 20, 44);
	ctx.font = '500 15px system-ui, sans-serif';
	ctx.fillStyle = '#9aa3ad';
	ctx.fillText('384,400 km', 20, 70);
	ctx.fillText('to Supercharger', 20, 90);
	ctx.fillStyle = '#2ec26e';
	ctx.fillRect(20, 108, 128, 5);
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	return tex;
}

export async function createModelY() {
	const draco = new DRACOLoader().setDecoderPath('./vendor/three/addons/libs/draco/gltf/');
	draco.preload(); // start the wasm fetch alongside the GLB download
	const loader = new GLTFLoader().setDRACOLoader(draco);
	const gltf = await loader.loadAsync('./assets/modely.glb');
	const root = gltf.scene;
	root.updateMatrixWorld(true);

	const group = new THREE.Group();
	group.add(root);

	// ---- material upgrades
	let paintMat = null;
	const lampMats = { head: [], tail: [] };
	root.traverse((o) => {
		if (!o.isMesh) return;
		o.castShadow = true;
		const name = o.material?.name || '';
		if (name === 'Carro_Pintura' && !paintMat) {
			paintMat = new THREE.MeshPhysicalMaterial({
				color: 0xffffff, map: o.material.map || null,
				metalness: 0.55, roughness: 0.35,
				clearcoat: 1, clearcoatRoughness: 0.08,
			});
			paintMat.name = 'Carro_Pintura'; // assign() classifies by material name
		}
		if (name.startsWith('Carro_Metal_Farol')) lampMats.head.push(o.material);
		if (name === 'Carro_Metal_Lanterna_Traseira' || name === 'Carro_Metal_Vermelho' || name === 'Carro_Metal_Vermelho_1') lampMats.tail.push(o.material);
		if (name === 'Carro_Vidros2') {
			o.material.roughness = 0.05;
			o.material.metalness = 0.4;
			o.castShadow = false;
		}
	});
	root.traverse((o) => {
		if (o.isMesh && o.material?.name === 'Carro_Pintura') o.material = paintMat;
	});
	lampMats.head.forEach((m) => { m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = 0.05; });
	lampMats.tail.forEach((m) => { m.emissive = new THREE.Color(0xff2222); m.emissiveIntensity = 0.12; });

	// ---- split merged glass, chrome, and mirrors into islands
	const meshes = [];
	root.traverse((o) => { if (o.isMesh) meshes.push(o); });
	const splittable = meshes.filter((o) =>
		['Carro_Vidros2', 'Carro_Espelhos', 'Carro_Cromado'].includes(o.material?.name));
	for (const m of splittable) splitIslands(m);
	root.updateMatrixWorld(true);

	// ---- hinge pivots (positions from the model's world-space part layout)
	const hinges = {};
	function makePivot(name, pos, axis, angle, speed) {
		const pivot = new THREE.Group();
		pivot.position.copy(pos);
		group.add(pivot);
		hinges[name] = new Hinge(pivot, axis, angle, speed);
		return pivot;
	}
	// door hinges: vertical axis at each door's leading edge
	const pivots = {
		doorFL: makePivot('doorFL', new THREE.Vector3(0.74, 0.8, 0.93), 'y', -1.05),
		doorFR: makePivot('doorFR', new THREE.Vector3(-0.74, 0.8, 0.93), 'y', 1.05),
		doorRL: makePivot('doorRL', new THREE.Vector3(0.74, 0.8, -0.25), 'y', -1.05),
		doorRR: makePivot('doorRR', new THREE.Vector3(-0.74, 0.8, -0.25), 'y', 1.05),
		frunk: makePivot('frunk', new THREE.Vector3(0, 1.03, 1.19), 'x', -0.52, 2.2),
		liftgate: makePivot('liftgate', new THREE.Vector3(0, 1.46, -1.40), 'x', 1.12, 2.2),
	};

	// ---- classify every mesh by world-space box into a rig part
	const A_PILLAR = 0.95, B_PILLAR = -0.28, C_PILLAR = -1.30;
	const rigTable = []; // audit: { name, mat, pivot }

	function classify(mesh) {
		const box = new THREE.Box3().setFromObject(mesh);
		const c = box.getCenter(new THREE.Vector3());
		const ax = Math.abs(c.x);
		const matName = mesh.material?.name || '';
		const side = c.x > 0 ? 'L' : 'R';

		// hood (paint panel high on the nose, centered)
		if (matName === 'Carro_Pintura' && c.z > 1.2 && c.y > 0.8 && ax < 0.3) return 'frunk';
		// liftgate: paint / lamps / red lens / chrome / rear glass at the tail
		const gateMat = matName === 'Carro_Pintura' || matName.startsWith('Carro_Metal_Vermelho') ||
			matName === 'Carro_Metal_Lanterna_Traseira' || matName === 'Carro_Vidro_Vermelho2' ||
			matName === 'Carro_Cromado' || matName === 'Carro_Plastico_Brilho';
		if (gateMat && c.z < -1.45 && c.y > 0.7) {
			// quarter panels stay put — but spoiler corner tips (high, near the
			// x edges) travel with the gate or they'd hover once it swings open
			if (matName === 'Carro_Pintura' && ax > 0.55 && c.y < 1.15) return null;
			return 'liftgate';
		}
		if (matName === 'Carro_Vidros2' && c.z < -1.48 && c.y > 1.1 && ax < 0.5) return 'liftgate'; // rear glass
		// door-band pieces (panels, windows, belt trim, handles, chrome DLO)
		const doorish = ['Carro_Pintura', 'Carro_Vidros2', 'Carro_Plastico_Brilho', 'Carro_Cromado'].includes(matName);
		if (doorish && ax > 0.55 && c.y > 0.35 && box.min.z < A_PILLAR + 0.3 && box.max.z > C_PILLAR - 0.4) {
			if (matName === 'Carro_Vidros2' && c.y > 1.45) return null; // roof glass
			// full-length strips get cut at the pillars and re-classified
			const crossesB = box.min.z < B_PILLAR - 0.12 && box.max.z > B_PILLAR + 0.12;
			const crossesA = box.max.z > A_PILLAR + 0.1 && box.min.z < A_PILLAR - 0.1;
			const crossesC = box.min.z < C_PILLAR - 0.1 && box.max.z > C_PILLAR + 0.1;
			if (crossesA || crossesB || crossesC) return 'split';
			if (c.z >= B_PILLAR && c.z <= A_PILLAR) return 'doorF' + side;
			if (c.z >= C_PILLAR && c.z < B_PILLAR) return 'doorR' + side;
			return null;
		}
		// mirrors (glass + painted caps) ride the front doors
		if ((matName === 'Carro_Espelhos' || matName === 'Carro_Pintura') && ax > 0.8 && c.y > 1.0 && c.z > 0.3 && c.z < 1.0) {
			return 'doorF' + side;
		}
		return null;
	}

	function place(mesh, dest) {
		if (dest && dest !== 'split') {
			pivots[dest].attach(mesh);
			rigTable.push({ name: mesh.name, mat: mesh.material?.name, pivot: dest });
		}
	}

	const allMeshes = [];
	root.traverse((o) => { if (o.isMesh) allMeshes.push(o); });
	for (const mesh of allMeshes) {
		const dest = classify(mesh);
		if (dest === 'split') {
			// zones (z descending): beyond-A | front door | rear door | quarter
			const side = worldCenter(mesh).x > 0 ? 'L' : 'R'; // before detach
			const parts = splitAtWorldZ(mesh, [A_PILLAR, B_PILLAR, C_PILLAR]);
			if (parts[1]) place(parts[1], 'doorF' + side);
			if (parts[2]) place(parts[2], 'doorR' + side);
			// parts[0] (A-pillar run) and parts[3] (quarter) stay static
		} else {
			place(mesh, dest);
		}
	}
	if (typeof window !== 'undefined') window.__rigTable = rigTable;

	// ---- consolidate: merge each pivot's pieces per material (the chrome badge
	// lettering alone splits into ~1500 islands = ~1500 draw calls otherwise)
	function consolidate(container) {
		container.updateWorldMatrix(true, true);
		const byMat = new Map();
		const meshes = [];
		container.traverse((o) => { if (o.isMesh && o !== container) meshes.push(o); });
		for (const m of meshes) {
			if (!byMat.has(m.material)) byMat.set(m.material, []);
			byMat.get(m.material).push(m);
		}
		const inv = new THREE.Matrix4().copy(container.matrixWorld).invert();
		for (const [mat, list] of byMat) {
			if (list.length < 2) continue;
			const geos = list.map((m) => {
				const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
				g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
				for (const name of Object.keys(g.attributes)) {
					if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
				}
				return g;
			});
			const merged = mergeGeometries(geos, false);
			if (!merged) continue;
			list.forEach((m) => m.parent.remove(m));
			const mesh = new THREE.Mesh(merged, mat);
			mesh.castShadow = list[0].castShadow;
			container.add(mesh);
		}
	}
	Object.values(pivots).forEach(consolidate);
	consolidate(root);

	// ---- cabin touchscreen (the model's interior has no lit display)
	const screenGroup = new THREE.Group();
	const bezel = new THREE.Mesh(
		new THREE.BoxGeometry(0.40, 0.27, 0.02),
		new THREE.MeshStandardMaterial({ color: 0x0a0b0c, roughness: 0.4 })
	);
	const screen = new THREE.Mesh(
		new THREE.PlaneGeometry(0.36, 0.235),
		new THREE.MeshBasicMaterial({ map: screenTexture() })
	);
	screen.position.z = 0.011;
	screenGroup.add(bezel, screen);
	screenGroup.position.set(0, 0.97, 0.40);
	screenGroup.rotation.y = Math.PI; // face the cabin
	screenGroup.rotation.x = 0.08;
	group.add(screenGroup);

	// ---- headlight beams for the lunar night
	const beams = [];
	for (const side of [1, -1]) {
		const spot = new THREE.SpotLight(0xf2f6ff, 0, 30, 0.5, 0.5, 1.2);
		spot.position.set(side * 0.62, 0.78, 2.3);
		spot.target.position.set(side * 1.3, 0, 10);
		group.add(spot, spot.target);
		beams.push(spot);
	}

	// ---- charge port LED (left rear quarter; port door is merged into the body)
	const portLedMat = new THREE.MeshStandardMaterial({ color: 0x0e2a14, emissive: 0x36ff6e, emissiveIntensity: 0 });
	const portLed = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16), portLedMat);
	portLed.position.set(0.845, 1.05, -1.93);
	portLed.rotation.y = Math.PI / 2 + 0.3;
	group.add(portLed);

	// ---- contact shadow blob
	const blobCanvas = document.createElement('canvas');
	blobCanvas.width = blobCanvas.height = 256;
	const bctx = blobCanvas.getContext('2d');
	const grad = bctx.createRadialGradient(128, 128, 20, 128, 128, 126);
	grad.addColorStop(0, 'rgba(0,0,0,0.5)');
	grad.addColorStop(0.75, 'rgba(0,0,0,0.22)');
	grad.addColorStop(1, 'rgba(0,0,0,0)');
	bctx.fillStyle = grad;
	bctx.fillRect(0, 0, 256, 256);
	const blob = new THREE.Mesh(
		new THREE.PlaneGeometry(2.8, 5.6),
		new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blobCanvas), transparent: true, depthWrite: false })
	);
	blob.rotation.x = -Math.PI / 2;
	blob.position.y = 0.015;
	group.add(blob);

	// ---- API
	let lightsOn = false;
	let charging = false;
	let chargeT = 0;

	function setPaint(hex) { paintMat.color.set(hex); }
	function setLights(on) {
		lightsOn = on;
		lampMats.head.forEach((m) => { m.emissiveIntensity = on ? 2.8 : 0.05; });
		lampMats.tail.forEach((m) => { m.emissiveIntensity = on ? 2.0 : 0.12; });
		beams.forEach((b) => { b.intensity = on ? 60 : 0; });
	}
	function setChargePort(open) {
		charging = open;
		if (!open) portLedMat.emissiveIntensity = 0;
	}
	function update(dt) {
		let moving = false;
		Object.values(hinges).forEach((h) => {
			if (Math.abs(h.target - h.current) > 0.0004) moving = true;
			h.update(dt);
		});
		if (charging) {
			chargeT += dt;
			portLedMat.emissiveIntensity = 1.4 + Math.sin(chargeT * 4) * 0.9;
		}
		return moving;
	}

	return {
		group, hinges,
		colors: PAINT,
		setPaint, setLights, setChargePort, update,
		get lightsOn() { return lightsOn; },
		attribution: '"2021 Tesla Model Y" by tonielpro520 (CC-BY-4.0)',
		interiorEye: new THREE.Vector3(0.35, 1.18, -0.10),
		interiorTarget: new THREE.Vector3(-0.05, 0.88, 0.75),
	};
}
