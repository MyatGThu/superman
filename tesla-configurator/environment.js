import * as THREE from 'three';

// Lunar staging: regolith ground with craters, landing-pad decal, starfield
// with a Milky Way band, Earth with earthshine, and harsh airless sunlight.

const SUN_DIR = new THREE.Vector3(0.55, 0.72, 0.42).normalize();
const EARTH_POS = new THREE.Vector3(-42, 58, -95);

function makeCanvas(size, draw) {
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = size;
	draw(canvas.getContext('2d'), size);
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	return tex;
}

// deterministic pseudo-random so the terrain is stable across loads
function mulberry32(seed) {
	return () => {
		seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function createGround() {
	const rand = mulberry32(1969); // ponytail: fixed seed, terrain never needs to vary
	const radius = 90;
	const geo = new THREE.CircleGeometry(radius, 160, 0, Math.PI * 2);
	geo.rotateX(-Math.PI / 2);

	const craters = [];
	for (let i = 0; i < 14; i++) {
		const ang = rand() * Math.PI * 2;
		const dist = 10 + rand() * 65;
		craters.push({
			x: Math.cos(ang) * dist,
			z: Math.sin(ang) * dist,
			r: 1.5 + rand() * (dist > 30 ? 9 : 3.5),
		});
	}

	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i), z = pos.getZ(i);
		const d0 = Math.hypot(x, z);
		// gentle rolling swells, flattened near the car
		let y = (Math.sin(x * 0.16) * Math.cos(z * 0.13) + Math.sin(x * 0.05 + z * 0.07) * 2.2) * 0.16;
		y *= THREE.MathUtils.smoothstep(d0, 5, 14);
		for (const c of craters) {
			const d = Math.hypot(x - c.x, z - c.z) / c.r;
			if (d < 1.4) {
				const bowl = d < 1 ? -Math.cos(d * Math.PI * 0.5) * 0.34 * c.r : 0;
				const rim = Math.exp(-((d - 1) * (d - 1)) * 14) * 0.1 * c.r;
				y += bowl + rim;
			}
		}
		pos.setY(i, y);
	}
	geo.computeVertexNormals();

	const speckle = makeCanvas(512, (ctx, s) => {
		ctx.fillStyle = '#7d7d80';
		ctx.fillRect(0, 0, s, s);
		const r = mulberry32(11);
		for (let i = 0; i < 26000; i++) {
			const v = 108 + Math.floor(r() * 48);
			ctx.fillStyle = `rgb(${v},${v},${v + 2})`;
			ctx.fillRect(r() * s, r() * s, 1 + r() * 2, 1 + r() * 2);
		}
		for (let i = 0; i < 260; i++) {
			ctx.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.12})`;
			ctx.beginPath();
			ctx.arc(r() * s, r() * s, 1 + r() * 7, 0, Math.PI * 2);
			ctx.fill();
		}
	});
	speckle.wrapS = speckle.wrapT = THREE.RepeatWrapping;
	speckle.repeat.set(18, 18);

	const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
		map: speckle,
		bumpMap: speckle,
		bumpScale: 0.6,
		roughness: 1,
		metalness: 0,
	}));
	ground.receiveShadow = true;
	return ground;
}

function createLandingPad() {
	const tex = makeCanvas(512, (ctx, s) => {
		const c = s / 2;
		ctx.strokeStyle = 'rgba(230,232,238,0.85)';
		ctx.lineWidth = 5;
		ctx.beginPath();
		ctx.arc(c, c, s * 0.46, 0, Math.PI * 2);
		ctx.stroke();
		ctx.setLineDash([26, 20]);
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.arc(c, c, s * 0.395, 0, Math.PI * 2);
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.font = '600 22px system-ui, sans-serif';
		ctx.fillStyle = 'rgba(230,232,238,0.85)';
		ctx.textAlign = 'center';
		ctx.fillText('SEA OF TRANQUILITY · LZ-01', c, s * 0.09);
	});
	const pad = new THREE.Mesh(
		new THREE.PlaneGeometry(9.4, 9.4),
		new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.32, depthWrite: false })
	);
	pad.rotation.x = -Math.PI / 2;
	pad.rotation.z = Math.PI;
	pad.position.y = 0.012;
	return pad;
}

function createStars() {
	const group = new THREE.Group();
	const rand = mulberry32(42);

	function starCloud(count, size, opacity, bandBias) {
		const positions = new Float32Array(count * 3);
		for (let i = 0; i < count; i++) {
			let v = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1);
			if (v.lengthSq() < 0.01) v.set(0.1, 1, 0.1);
			v.normalize();
			if (bandBias) {
				// squeeze toward a tilted great circle = Milky Way band
				const band = new THREE.Vector3(0.3, 1, 0.15).normalize();
				const d = v.dot(band);
				v.addScaledVector(band, -d * 0.86).normalize();
			}
			// keep most stars above the horizon glow
			if (v.y < -0.08) v.y = -v.y * 0.3 - 0.02;
			v.normalize().multiplyScalar(420 + rand() * 160);
			positions.set([v.x, v.y, v.z], i * 3);
		}
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		const mat = new THREE.PointsMaterial({
			color: 0xffffff, size, sizeAttenuation: false,
			transparent: true, opacity, depthWrite: false,
		});
		const points = new THREE.Points(geo, mat);
		group.add(points);
		return points;
	}

	starCloud(2600, 1.4, 0.75, false);
	starCloud(900, 2.4, 0.9, false);
	starCloud(4200, 1.2, 0.32, true); // Milky Way dust
	return group;
}

function createEarth() {
	const group = new THREE.Group();
	const tex = makeCanvas(512, (ctx, s) => {
		const r = mulberry32(7);
		const grad = ctx.createLinearGradient(0, 0, 0, s);
		grad.addColorStop(0, '#1c4d8f');
		grad.addColorStop(0.5, '#2a6cc4');
		grad.addColorStop(1, '#173f78');
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, s, s);
		// continents: clustered blobs
		ctx.fillStyle = 'rgba(96,116,74,0.9)';
		for (let k = 0; k < 7; k++) {
			const cx = r() * s, cy = s * 0.18 + r() * s * 0.6;
			for (let i = 0; i < 26; i++) {
				ctx.beginPath();
				ctx.arc(cx + (r() - 0.5) * 90, cy + (r() - 0.5) * 60, 4 + r() * 16, 0, Math.PI * 2);
				ctx.fill();
			}
		}
		// swirling cloud streaks
		ctx.strokeStyle = 'rgba(255,255,255,0.75)';
		ctx.lineCap = 'round';
		for (let i = 0; i < 60; i++) {
			ctx.lineWidth = 2 + r() * 7;
			ctx.globalAlpha = 0.25 + r() * 0.5;
			ctx.beginPath();
			const x = r() * s, y = r() * s, len = 30 + r() * 90;
			ctx.moveTo(x, y);
			ctx.quadraticCurveTo(x + len * 0.5, y + (r() - 0.5) * 26, x + len, y + (r() - 0.5) * 14);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
		// polar caps
		ctx.fillStyle = 'rgba(255,255,255,0.9)';
		ctx.fillRect(0, 0, s, s * 0.05);
		ctx.fillRect(0, s * 0.95, s, s * 0.05);
	});

	const earth = new THREE.Mesh(
		new THREE.SphereGeometry(6.2, 48, 32),
		new THREE.MeshLambertMaterial({ map: tex })
	);
	group.add(earth);

	const glowTex = makeCanvas(128, (ctx, s) => {
		const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.3, s / 2, s / 2, s * 0.5);
		g.addColorStop(0, 'rgba(90,150,255,0.5)');
		g.addColorStop(0.7, 'rgba(70,120,230,0.16)');
		g.addColorStop(1, 'rgba(60,110,220,0)');
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, s, s);
	});
	const glow = new THREE.Sprite(new THREE.SpriteMaterial({
		map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
	}));
	glow.scale.setScalar(17.5);
	group.add(glow);

	group.position.copy(EARTH_POS);
	return { group, earth };
}

function createSunSprite() {
	const tex = makeCanvas(128, (ctx, s) => {
		const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
		g.addColorStop(0, 'rgba(255,255,250,1)');
		g.addColorStop(0.12, 'rgba(255,250,235,0.95)');
		g.addColorStop(0.4, 'rgba(255,240,210,0.25)');
		g.addColorStop(1, 'rgba(255,235,200,0)');
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, s, s);
	});
	const sun = new THREE.Sprite(new THREE.SpriteMaterial({
		map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
	}));
	sun.position.copy(SUN_DIR).multiplyScalar(500);
	sun.scale.setScalar(90);
	return sun;
}

export function createEnvironment() {
	const group = new THREE.Group();

	group.add(createGround());
	group.add(createLandingPad());
	group.add(createStars());

	const { group: earthGroup, earth } = createEarth();
	group.add(earthGroup);
	group.add(createSunSprite());

	const sun = new THREE.DirectionalLight(0xfff4e2, 3.2);
	sun.position.copy(SUN_DIR).multiplyScalar(40);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	sun.shadow.camera.left = -7;
	sun.shadow.camera.right = 7;
	sun.shadow.camera.top = 7;
	sun.shadow.camera.bottom = -7;
	sun.shadow.camera.far = 90;
	sun.shadow.bias = -0.0004;
	sun.shadow.normalBias = 0.02;
	group.add(sun);
	group.add(sun.target);

	// earthshine: the soft blue fill on the shadow side
	const earthshine = new THREE.DirectionalLight(0x7fa8ff, 0.5);
	earthshine.position.copy(EARTH_POS);
	group.add(earthshine);
	group.add(earthshine.target);

	group.add(new THREE.AmbientLight(0x1c2230, 2.2));

	let t = 0;
	function update(dt) {
		t += dt;
		earth.rotation.y = t * 0.008; // one lazy revolution; barely perceptible, alive
	}

	return { group, update };
}
