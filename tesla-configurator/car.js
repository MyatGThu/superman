import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const PAINT_COLORS = {
	pearlWhite: 0xf1f1ef,
	solidBlack: 0x161616,
	midnightSilver: 0x54565a,
	deepBlue: 0x1a3a63,
	red: 0x87070f,
};

function panel(w, h, d, radius = 0.05) {
	return new RoundedBoxGeometry(w, h, d, 3, radius);
}

class Hinge {
	constructor(pivot, axis, openAngle, { speed = 3.2 } = {}) {
		this.pivot = pivot;
		this.axis = axis;
		this.openAngle = openAngle;
		this.speed = speed;
		this.target = 0;
		this.current = 0;
		this.isOpen = false;
	}

	toggle() {
		this.isOpen = !this.isOpen;
		this.target = this.isOpen ? this.openAngle : 0;
	}

	set(open) {
		this.isOpen = open;
		this.target = open ? this.openAngle : 0;
	}

	update(dt) {
		if (Math.abs(this.target - this.current) < 0.0005) return;
		this.current += (this.target - this.current) * Math.min(1, dt * this.speed);
		this.pivot.rotation[this.axis] = this.current;
	}
}

export function createCar() {
	const group = new THREE.Group();
	const hinges = {};
	const shellParts = [];

	const bodyMat = new THREE.MeshPhysicalMaterial({
		color: PAINT_COLORS.pearlWhite,
		metalness: 0.55,
		roughness: 0.35,
		clearcoat: 1,
		clearcoatRoughness: 0.12,
	});
	const cabinMat = new THREE.MeshPhysicalMaterial({
		color: 0x0d0e10,
		metalness: 0.2,
		roughness: 0.15,
		side: THREE.DoubleSide,
	});
	const trimMat = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.7, metalness: 0.1 });
	const rimMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.9, roughness: 0.25 });
	const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
	const interiorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.85 });
	const dashMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1f, roughness: 0.6 });
	const cavityMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 });
	const headlightMat = new THREE.MeshStandardMaterial({
		color: 0xffffff,
		emissive: 0xffffff,
		emissiveIntensity: 0,
	});
	const taillightMat = new THREE.MeshStandardMaterial({
		color: 0x330000,
		emissive: 0xff1818,
		emissiveIntensity: 0,
	});
	const chargeLedMat = new THREE.MeshStandardMaterial({
		color: 0x113311,
		emissive: 0x22ff44,
		emissiveIntensity: 0,
	});

	const paintedMaterials = [bodyMat];

	// ---- lower body ----
	const bodyW = 4.3; // length, +X = front/nose
	const bodyH = 0.78;
	const bodyD = 1.9;
	const bodyY = 0.62;
	const body = new THREE.Mesh(panel(bodyW, bodyH, bodyD, 0.18), bodyMat);
	body.name = 'body';
	body.position.set(-0.1, bodyY, 0);
	body.castShadow = true;
	group.add(body);
	shellParts.push(body);

	// ---- cabin / greenhouse ----
	const cabinW = 2.05;
	const cabinH = 0.62;
	const cabinD = 1.62;
	const cabin = new THREE.Mesh(panel(cabinW, cabinH, cabinD, 0.22), cabinMat);
	cabin.name = 'cabin';
	const cabinY = bodyY + bodyH / 2 + cabinH / 2 - 0.08;
	cabin.position.set(-0.25, cabinY, 0);
	cabin.castShadow = true;
	group.add(cabin);
	shellParts.push(cabin);

	const halfD = bodyD / 2;
	const doorH = bodyH - 0.06;
	const doorY = bodyY;
	const doorThickness = 0.06;

	function makeDoor(name, centerX, width, side) {
		const hingeX = centerX + width / 2;
		const pivot = new THREE.Group();
		pivot.position.set(hingeX, doorY, side * halfD);
		group.add(pivot);
		shellParts.push(pivot);

		const mesh = new THREE.Mesh(panel(width, doorH, doorThickness, 0.05), bodyMat);
		mesh.name = name;
		mesh.position.set(-width / 2, 0, side * (doorThickness / 2 + 0.005));
		mesh.castShadow = true;
		pivot.add(mesh);

		const openAngle = side > 0 ? Math.PI * 0.55 : -Math.PI * 0.55;
		hinges[name] = new Hinge(pivot, 'y', openAngle);
		return { pivot, mesh };
	}

	makeDoor('doorFL', 0.75, 1.05, 1);
	makeDoor('doorFR', 0.75, 1.05, -1);
	makeDoor('doorRL', -0.55, 0.95, 1);
	makeDoor('doorRR', -0.55, 0.95, -1);

	// ---- frunk (hood) ----
	const bodyFrontX = -0.1 + bodyW / 2;
	const bodyRearX = -0.1 - bodyW / 2;
	const hoodW = 0.95;
	const hoodD = bodyD - 0.16;
	const hoodCenterX = bodyFrontX - hoodW / 2;
	const hoodHingeX = hoodCenterX - hoodW / 2;
	const hoodY = bodyY + bodyH / 2 - 0.02;

	const hoodPivot = new THREE.Group();
	hoodPivot.position.set(hoodHingeX, hoodY, 0);
	group.add(hoodPivot);
	shellParts.push(hoodPivot);
	const hoodMesh = new THREE.Mesh(panel(hoodW, 0.07, hoodD, 0.05), bodyMat);
	hoodMesh.name = 'hood';
	hoodMesh.position.set(hoodW / 2, 0.035, 0);
	hoodMesh.castShadow = true;
	hoodPivot.add(hoodMesh);
	hinges.frunk = new Hinge(hoodPivot, 'z', Math.PI * 0.42);

	const frunkCavity = new THREE.Mesh(new THREE.BoxGeometry(hoodW - 0.1, 0.22, hoodD - 0.1), cavityMat);
	frunkCavity.position.set(hoodCenterX, bodyY + 0.05, 0);
	group.add(frunkCavity);
	shellParts.push(frunkCavity);

	// ---- trunk lid ----
	const trunkW = 0.85;
	const trunkD = bodyD - 0.16;
	const trunkCenterX = bodyRearX + trunkW / 2;
	const trunkHingeX = trunkCenterX + trunkW / 2;
	const trunkY = bodyY + bodyH / 2 - 0.02;

	const trunkPivot = new THREE.Group();
	trunkPivot.position.set(trunkHingeX, trunkY, 0);
	group.add(trunkPivot);
	shellParts.push(trunkPivot);
	const trunkMesh = new THREE.Mesh(panel(trunkW, 0.07, trunkD, 0.05), bodyMat);
	trunkMesh.name = 'trunk';
	trunkMesh.position.set(-trunkW / 2, 0.035, 0);
	trunkMesh.castShadow = true;
	trunkPivot.add(trunkMesh);
	hinges.trunk = new Hinge(trunkPivot, 'z', -Math.PI * 0.48);

	const trunkCavity = new THREE.Mesh(new THREE.BoxGeometry(trunkW + 0.1, 0.5, trunkD - 0.1), cavityMat);
	trunkCavity.position.set(trunkCenterX - 0.05, bodyY + 0.15, 0);
	group.add(trunkCavity);
	shellParts.push(trunkCavity);

	// ---- charge port door ----
	const portPivot = new THREE.Group();
	portPivot.position.set(-1.15, bodyY - 0.05, -halfD - 0.01);
	group.add(portPivot);
	shellParts.push(portPivot);
	const portMesh = new THREE.Mesh(panel(0.22, 0.16, 0.03, 0.02), trimMat);
	portMesh.position.set(0.11, 0, -0.015);
	portPivot.add(portMesh);
	const portLed = new THREE.Mesh(new THREE.CircleGeometry(0.02, 12), chargeLedMat);
	portLed.position.set(0.11, 0, -0.03);
	portLed.rotation.y = Math.PI;
	portPivot.add(portLed);
	hinges.chargePort = new Hinge(portPivot, 'y', Math.PI * 0.75);

	// ---- wheels ----
	const wheelRadius = 0.345;
	function makeWheel(x, z) {
		const wheel = new THREE.Group();
		const tire = new THREE.Mesh(
			new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.24, 28),
			tireMat
		);
		tire.rotation.x = Math.PI / 2;
		tire.castShadow = true;
		wheel.add(tire);
		const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.6, wheelRadius * 0.6, 0.25, 24), rimMat);
		rim.rotation.x = Math.PI / 2;
		wheel.add(rim);
		wheel.position.set(x, wheelRadius, z);
		group.add(wheel);
		shellParts.push(wheel);
		return wheel;
	}
	const wheels = [
		makeWheel(1.35, halfD - 0.05),
		makeWheel(1.35, -halfD + 0.05),
		makeWheel(-1.35, halfD - 0.05),
		makeWheel(-1.35, -halfD + 0.05),
	];

	// ---- lights ----
	function makeLight(x, mat, w = 0.5) {
		const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, w), mat);
		mesh.position.set(x, bodyY + 0.05, 0);
		group.add(mesh);
		shellParts.push(mesh);
		return mesh;
	}
	const headlightL = makeLight(bodyFrontX + 0.02, headlightMat, 0.55);
	headlightL.position.z = halfD - 0.35;
	const headlightR = headlightL.clone();
	headlightR.material = headlightMat;
	headlightR.position.z = -(halfD - 0.35);
	group.add(headlightR);
	shellParts.push(headlightR);

	const taillightL = makeLight(bodyRearX - 0.02, taillightMat, 0.5);
	taillightL.position.z = halfD - 0.4;
	const taillightR = taillightL.clone();
	taillightR.material = taillightMat;
	taillightR.position.z = -(halfD - 0.4);
	group.add(taillightR);
	shellParts.push(taillightR);

	// ---- interior ----
	const interior = new THREE.Group();
	const dash = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, cabinD - 0.2), dashMat);
	dash.position.set(0.55, bodyY + 0.1, 0);
	interior.add(dash);

	const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 8, 24), trimMat);
	wheelRing.position.set(0.42, bodyY + 0.28, 0.32);
	wheelRing.rotation.y = Math.PI / 2.3;
	interior.add(wheelRing);

	function makeSeat(x, z) {
		const seat = new THREE.Group();
		const base = new THREE.Mesh(panel(0.42, 0.16, 0.42, 0.06), interiorMat);
		base.position.set(0, bodyY - 0.05, 0);
		seat.add(base);
		const back = new THREE.Mesh(panel(0.42, 0.5, 0.1, 0.06), interiorMat);
		back.position.set(-0.16, bodyY + 0.2, 0);
		back.rotation.z = -0.08;
		seat.add(back);
		seat.position.set(x, 0, z);
		return seat;
	}
	interior.add(makeSeat(0.1, 0.32));
	interior.add(makeSeat(0.1, -0.32));
	interior.add(makeSeat(-0.7, 0.32));
	interior.add(makeSeat(-0.7, -0.32));
	group.add(interior);

	// ---- ground contact shadow blob ----
	const shadowTex = (() => {
		const size = 256;
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = size;
		const ctx = canvas.getContext('2d');
		const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
		gradient.addColorStop(0, 'rgba(0,0,0,0.45)');
		gradient.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, size, size);
		return new THREE.CanvasTexture(canvas);
	})();
	const contactShadow = new THREE.Mesh(
		new THREE.PlaneGeometry(5.6, 2.6),
		new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
	);
	contactShadow.rotation.x = -Math.PI / 2;
	contactShadow.position.y = 0.005;
	group.add(contactShadow);
	shellParts.push(contactShadow);

	function setPaint(hex) {
		paintedMaterials.forEach((m) => m.color.set(hex));
	}

	function setLights(on) {
		const intensity = on ? 2.2 : 0;
		headlightMat.emissiveIntensity = intensity;
		taillightMat.emissiveIntensity = on ? 1.6 : 0;
	}

	function setChargePort(on) {
		hinges.chargePort.set(on);
		chargeLedMat.emissiveIntensity = on ? 1.5 : 0;
	}

	function setShellVisible(visible) {
		shellParts.forEach((p) => {
			p.visible = visible;
		});
	}

	function update(dt) {
		Object.values(hinges).forEach((h) => h.update(dt));
		wheels.forEach((w) => {
			if (dt) w.children[0].rotation.z += dt * 0.0001; // idle static, kept for future drive animation
		});
	}

	return {
		group,
		hinges,
		colors: PAINT_COLORS,
		setPaint,
		setLights,
		setChargePort,
		setShellVisible,
		update,
		interiorTarget: new THREE.Vector3(0.6, bodyY + 0.23, 0.1),
		interiorEye: new THREE.Vector3(-0.1, bodyY + 0.53, 0.3),
	};
}
