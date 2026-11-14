import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

// ======================================================
// LUMEN SOCIETY — ISLAND CORE 0.3
// Ilha natural Low Poly: sem personagens e sem construções.
// ======================================================

const host = document.getElementById('island-canvas');

if (!host) {
  throw new Error('Elemento #island-canvas não encontrado.');
}

// CENA E CÂMERA

const scene = new THREE.Scene();
scene.background = new THREE.Color('#b9d9d2');
scene.fog = new THREE.Fog('#b9d9d2', 24, 55);

const focus = new THREE.Vector3(0, 0.2, 0);

const camera = new THREE.OrthographicCamera(
  -10, 10, 7, -7, 0.1, 100
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

host.innerHTML = '';
host.style.position = 'relative';
host.style.overflow = 'hidden';
host.appendChild(renderer.domElement);

renderer.domElement.style.display = 'block';
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
renderer.domElement.style.touchAction = 'none';

// ILUMINAÇÃO

scene.add(
  new THREE.HemisphereLight('#e8f5e9', '#647b65', 2.2)
);

const sunlight = new THREE.DirectionalLight('#fff0d2', 2.8);
sunlight.position.set(-8, 15, 10);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048);
sunlight.shadow.camera.left = -12;
sunlight.shadow.camera.right = 12;
sunlight.shadow.camera.top = 12;
sunlight.shadow.camera.bottom = -12;
sunlight.shadow.bias = -0.0003;
scene.add(sunlight);

// MATERIAIS

function material(color, roughness = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    flatShading: true
  });
}

const grassMaterial = material('#83b77d');
const lightGrassMaterial = material('#a6c987');
const darkGrassMaterial = material('#6f9e70');
const sandMaterial = material('#e5cf9e');
const waterMaterial = material('#70b7b2', 0.45);

const rockMaterials = [
  material('#aaa995'),
  material('#c5bea6'),
  material('#8f998e')
];

const leafMaterials = [
  material('#54896b'),
  material('#699a72'),
  material('#82aa79'),
  material('#9ab77c')
];

const trunkMaterial = material('#89684b');

const flowerMaterials = [
  material('#f1d59a'),
  material('#e9a5a0'),
  material('#f4eee0'),
  material('#d8a8d1')
];

// OCEANO

const SEA_LEVEL = -0.08;

const oceanGeometry = new THREE.PlaneGeometry(150, 150, 40, 40);
const ocean = new THREE.Mesh(oceanGeometry, waterMaterial);

ocean.rotation.x = -Math.PI / 2;
ocean.position.y = SEA_LEVEL;
ocean.receiveShadow = true;
scene.add(ocean);

// Ondulações decorativas próximas à costa.

const waves = [];

for (let i = 0; i < 18; i++) {
  const wave = new THREE.Mesh(
    new THREE.TorusGeometry(
      0.35 + (i % 3) * 0.2,
      0.018,
      4,
      20
    ),
    new THREE.MeshBasicMaterial({
      color: '#c0e3d3',
      transparent: true,
      opacity: 0.18
    })
  );

  const angle = i * 2.4;
  const radius = 6.25 + (i % 4) * 0.35;

  wave.rotation.x = -Math.PI / 2;
  wave.position.set(
    Math.cos(angle) * radius,
    SEA_LEVEL + 0.015,
    Math.sin(angle) * radius
  );

  scene.add(wave);
  waves.push(wave);
}

// TERRENO ORGÂNICO

const island = new THREE.Group();
scene.add(island);

const SEGMENTS = 64;
const RINGS = 14;
const RADIUS = 6.2;

function islandRadius(angle) {
  return RADIUS * (
    0.91 +
    Math.sin(angle * 3 + 0.5) * 0.045 +
    Math.sin(angle * 5 + 1.4) * 0.035 +
    Math.cos(angle * 2 - 0.8) * 0.035
  );
}

function terrainHeight(x, z) {
  const hill1 = Math.exp(
    -((x + 1.8) ** 2 + (z + 1.5) ** 2) / 5
  ) * 0.85;

  const hill2 = Math.exp(
    -((x - 2.1) ** 2 + (z - 1.1) ** 2) / 4
  ) * 0.55;

  const hill3 = Math.exp(
    -((x + 0.3) ** 2 + (z - 3.0) ** 2) / 3
  ) * 0.3;

  return 0.42 + hill1 + hill2 + hill3;
}

// Malha superior do terreno.

const topVertices = [];
const topIndices = [];

topVertices.push(0, terrainHeight(0, 0), 0);

for (let ring = 1; ring <= RINGS; ring++) {
  const fraction = ring / RINGS;

  for (let i = 0; i < SEGMENTS; i++) {
    const angle = (i / SEGMENTS) * Math.PI * 2;
    const radius = islandRadius(angle) * fraction;

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    topVertices.push(x, terrainHeight(x, z), z);
  }
}

// Triângulos do centro.

for (let i = 0; i < SEGMENTS; i++) {
  const next = (i + 1) % SEGMENTS;
  topIndices.push(0, 1 + next, 1 + i);
}

// Triângulos dos anéis.

for (let ring = 0; ring < RINGS - 1; ring++) {
  const currentStart = 1 + ring * SEGMENTS;
  const nextStart = currentStart + SEGMENTS;

  for (let i = 0; i < SEGMENTS; i++) {
    const next = (i + 1) % SEGMENTS;

    const a = currentStart + i;
    const b = currentStart + next;
    const c = nextStart + i;
    const d = nextStart + next;

    topIndices.push(a, b, c);
    topIndices.push(b, d, c);
  }
}

// Finalização da malha do terreno.

const topGeometry = new THREE.BufferGeometry();

topGeometry.setAttribute(
  'position',
  new THREE.Float32BufferAttribute(topVertices, 3)
);

topGeometry.setIndex(topIndices);
topGeometry.computeVertexNormals();

const terrain = new THREE.Mesh(topGeometry, grassMaterial);
terrain.receiveShadow = true;
terrain.castShadow = true;
island.add(terrain);

// COSTA DE AREIA

function createCoast() {
  const vertices = [];
  const indices = [];

  const layers = [
    { radius: 1.00, y: 0.35 },
    { radius: 1.04, y: 0.02 },
    { radius: 0.98, y: -0.48 }
  ];

  for (const layer of layers) {
    for (let i = 0; i < SEGMENTS; i++) {
      const angle = (i / SEGMENTS) * Math.PI * 2;
      const radius = islandRadius(angle) * layer.radius;

      vertices.push(
        Math.cos(angle) * radius,
        layer.y,
        Math.sin(angle) * radius
      );
    }
  }

  for (let layer = 0; layer < layers.length - 1; layer++) {
    const start = layer * SEGMENTS;
    const nextStart = start + SEGMENTS;

    for (let i = 0; i < SEGMENTS; i++) {
      const next = (i + 1) % SEGMENTS;

      const a = start + i;
      const b = start + next;
      const c = nextStart + i;
      const d = nextStart + next;

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3)
  );

  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const coast = new THREE.Mesh(geometry, sandMaterial);
  coast.receiveShadow = true;
  coast.castShadow = true;
  island.add(coast);
}

createCoast();

// ÁREAS DE VEGETAÇÃO

function grassPatch(x, z, scale, color) {
  const patch = new THREE.Mesh(
    new THREE.CircleGeometry(1, 9),
    color
  );

  patch.rotation.x = -Math.PI / 2;
  patch.position.set(x, terrainHeight(x, z) + 0.025, z);
  patch.scale.set(scale, scale * 0.75, 1);

  island.add(patch);
}

grassPatch(-2.2, 0.3, 1.3, lightGrassMaterial);
grassPatch(1.8, -1.8, 1.1, darkGrassMaterial);
grassPatch(2.5, 1.7, 1.0, lightGrassMaterial);
grassPatch(-1.0, 2.8, 0.8, darkGrassMaterial);

// ÁRVORES

const vegetation = new THREE.Group();
island.add(vegetation);

function createTree(x, z, scale = 1, variant = 0) {
  const group = new THREE.Group();

  group.position.set(x, terrainHeight(x, z), z);
  group.scale.setScalar(scale);

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 0.85, 6),
    trunkMaterial
  );

  trunk.position.y = 0.4;
  trunk.castShadow = true;
  group.add(trunk);

  const crown1 = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.72, 1),
    leafMaterials[variant % leafMaterials.length]
  );

  crown1.position.y = 1.05;
  crown1.scale.set(1, 1.05, 0.95);
  crown1.castShadow = true;
  group.add(crown1);

  const crown2 = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.48, 1),
    leafMaterials[(variant + 1) % leafMaterials.length]
  );

  crown2.position.set(0.32, 1.42, 0.05);
  crown2.castShadow = true;
  group.add(crown2);

  vegetation.add(group);

  return group;
}

const treePositions = [
  [-3.7, -2.1, 1.15],
  [-4.0, 0.2, 0.85],
  [-3.3, 2.2, 0.9],
  [-2.0, 3.3, 0.75],
  [-0.5, -3.8, 0.9],
  [1.3, -3.5, 0.85],
  [3.2, -2.5, 1.05],
  [3.8, -0.4, 0.85],
  [3.2, 2.3, 0.95],
  [1.5, 3.7, 0.8],
  [-1.5, -1.9, 0.75],
  [1.7, 1.4, 0.7]
];

const trees = [];

for (let i = 0; i < treePositions.length; i++) {
  const [x, z, scale] = treePositions[i];

  trees.push(createTree(x, z, scale, i % 4));
}

// ARBUSTOS

function createBush(x, z, scale = 1) {
  const group = new THREE.Group();

  group.position.set(x, terrainHeight(x, z), z);
  group.scale.setScalar(scale);

  for (let i = 0; i < 3; i++) {
    const bush = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.27, 1),
      leafMaterials[(i + 1) % leafMaterials.length]
    );

    bush.position.set(
      (i - 1) * 0.22,
      0.2 + (i % 2) * 0.1,
      (i % 2) * 0.12
    );

    bush.castShadow = true;
    group.add(bush);
  }

  vegetation.add(group);
}

const bushes = [
  [-3.1, -0.8],
  [-2.6, 2.7],
  [-1.8, -3.1],
  [0.2, -3.5],
  [2.8, -1.5],
  [3.5, 1.5],
  [0.8, 3.0],
  [-3.6, 1.2]
];

for (const [x, z] of bushes) {
  createBush(x, z, 0.8 + Math.random() * 0.5);
}

// PEDRAS

for (let i = 0; i < 35; i++) {
  const angle = i * 2.399;
  const radius = 2.8 + (i % 4) * 0.55;

  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(
      0.13 + (i % 3) * 0.055,
      0
    ),
    rockMaterials[i % rockMaterials.length]
  );

  rock.position.set(
    x,
    terrainHeight(x, z) + 0.08,
    z
  );

  rock.rotation.set(i, i * 0.7, i * 0.4);
  rock.castShadow = true;
  rock.receiveShadow = true;

  island.add(rock);
}

// FLORES

const flowers = [];

for (let i = 0; i < 55; i++) {
  const angle = i * 2.4;
  const radius = 1.4 + (i % 5) * 0.55;

  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  const flower = new THREE.Group();

  flower.position.set(
    x,
    terrainHeight(x, z),
    z
  );

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.025, 0.2, 5),
    leafMaterials[0]
  );

  stem.position.y = 0.1;
  flower.add(stem);

  const petals = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.09, 0),
    flowerMaterials[i % flowerMaterials.length]
  );

  petals.position.y = 0.23;
  petals.scale.y = 0.65;

  flower.add(petals);

  vegetation.add(flower);
  flowers.push(flower);
}

// CAMINHO NATURAL DE TERRA

const pathPoints = [
  new THREE.Vector3(-3.8, 0, 2.0),
  new THREE.Vector3(-2.6, 0, 1.2),
  new THREE.Vector3(-1.2, 0, 0.5),
  new THREE.Vector3(0.2, 0, 0.1),
  new THREE.Vector3(1.4, 0, -0.5),
  new THREE.Vector3(2.5, 0, -1.4),
  new THREE.Vector3(3.4, 0, -2.2)
];

const pathCurve = new THREE.CatmullRomCurve3(pathPoints);

const pathGeometry = new THREE.TubeGeometry(
  pathCurve,
  80,
  0.19,
  7,
  false
);

const pathMaterial = material('#d2b982');

const path = new THREE.Mesh(
  pathGeometry,
  pathMaterial
);

path.position.y = 0.05;
path.receiveShadow = true;

island.add(path);

// ======================================================
// CÂMERA: ROTAÇÃO, ZOOM E CONTROLES TOUCH
// ======================================================

let cameraAngle = Math.PI / 4;
let cameraDistance = 27; 

let dragging = false;
let previousPointer = { x: 0, y: 0 };

const activePointers = new Map();
let previousPinchDistance = 0;



function updateCamera() {
  // Câmera mais elevada, com visão inclinada de cima.
  const height = cameraDistance * 1.25;

  camera.position.set(
    Math.sin(cameraAngle) * cameraDistance,
    height,
    Math.cos(cameraAngle) * cameraDistance
  );

  camera.lookAt(focus);
}

function updateZoom() {
  const width = Math.max(1, host.clientWidth);
  const height = Math.max(1, host.clientHeight);
  const aspect = width / height;
  const viewSize = cameraDistance;

  // Mantém o tamanho vertical como referência.
  // Em telas retrato, ajusta a largura proporcionalmente.
  camera.top = viewSize / 2;
  camera.bottom = -viewSize / 2;

  const horizontalSize = viewSize * aspect;

  camera.left = -horizontalSize / 2;
  camera.right = horizontalSize / 2;

  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function changeZoom(amount) {
  cameraDistance = THREE.MathUtils.clamp(
  cameraDistance + amount,
  18,
  36
);

  updateZoom();
  updateCamera();
}

function getPinchDistance() {
  const points = Array.from(activePointers.values());

  if (points.length < 2) return 0;

  const dx = points[0].x - points[1].x;
  const dy = points[0].y - points[1].y;

  return Math.hypot(dx, dy);
}

// INTERAÇÃO COM O TOQUE

renderer.domElement.addEventListener('pointerdown', event => {
  activePointers.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY
  });

  renderer.domElement.setPointerCapture(event.pointerId);

  if (activePointers.size === 1) {
    dragging = true;

    previousPointer.x = event.clientX;
    previousPointer.y = event.clientY;
  }

  if (activePointers.size === 2) {
    dragging = false;
    previousPinchDistance = getPinchDistance();
  }
});

renderer.domElement.addEventListener('pointermove', event => {
  if (!activePointers.has(event.pointerId)) return;

  activePointers.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY
  });

  // ZOOM COM DOIS DEDOS

  if (activePointers.size === 2) {
    const currentDistance = getPinchDistance();

    if (previousPinchDistance > 0) {
      const difference =
        currentDistance - previousPinchDistance;

      changeZoom(-difference * 0.035);
    }

    previousPinchDistance = currentDistance;
    return;
  }

  // ROTAÇÃO COM UM DEDO

  if (dragging && activePointers.size === 1) {
    const deltaX = event.clientX - previousPointer.x;

    cameraAngle -= deltaX * 0.005;

    previousPointer.x = event.clientX;
    previousPointer.y = event.clientY;

    updateCamera();
  }
});

function stopPointer(event) {
  if (!activePointers.has(event.pointerId)) return;

  activePointers.delete(event.pointerId);

  if (activePointers.size < 2) {
    previousPinchDistance = 0;
  }

  if (activePointers.size === 1) {
    const remaining = Array.from(activePointers.values())[0];

    previousPointer.x = remaining.x;
    previousPointer.y = remaining.y;

    dragging = true;
  } else {
    dragging = false;
  }
}

renderer.domElement.addEventListener('pointerup', stopPointer);
renderer.domElement.addEventListener('pointercancel', stopPointer);
renderer.domElement.addEventListener('lostpointercapture', stopPointer);

// ZOOM COM RODA DO MOUSE

renderer.domElement.addEventListener('wheel', event => {
  event.preventDefault();
  changeZoom(event.deltaY * 0.025);
}, { passive: false });

// ======================================================
// BOTÕES DE ZOOM NA TELA
// ======================================================

const zoomControls = document.createElement('div');

zoomControls.style.cssText = `
  position: absolute;
  right: 16px;
  bottom: calc(30px + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 20;
`;

function createZoomButton(symbol, amount, label) {
  const button = document.createElement('button');

  button.type = 'button';
  button.textContent = symbol;
  button.setAttribute('aria-label', label);

  button.style.cssText = `
    width: 46px;
    height: 46px;
    border: 1px solid rgba(255,255,255,0.65);
    border-radius: 14px;
    background: rgba(35,65,58,0.82);
    color: #ffffff;
    font-size: 28px;
    font-weight: 500;
    line-height: 1;
    box-shadow: 0 3px 10px rgba(0,0,0,0.18);
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  `;

  button.addEventListener('pointerdown', event => {
    event.stopPropagation();
  });

  button.addEventListener('click', event => {
    event.stopPropagation();
    changeZoom(amount);
  });

  return button;
}

zoomControls.appendChild(
  createZoomButton('+', -1.5, 'Aumentar zoom')
);

zoomControls.appendChild(
  createZoomButton('−', 1.5, 'Diminuir zoom')
);

host.appendChild(zoomControls);

// ======================================================
// REDIMENSIONAMENTO
// ======================================================

function resize() {
  updateZoom();
  updateCamera();
}

const resizeObserver = new ResizeObserver(resize);

resizeObserver.observe(host);

updateZoom();
updateCamera();

// ======================================================
// ANIMAÇÃO
// ======================================================

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();

  // Movimento suave da água.

  ocean.position.y =
    SEA_LEVEL + Math.sin(elapsed * 0.8) * 0.015;

  // Ondulações decorativas.

  waves.forEach((wave, index) => {
    const pulse =
      Math.sin(elapsed * 1.2 + index) * 0.025;

    wave.scale.setScalar(1 + pulse);
  });

  // Movimento suave das copas.

  trees.forEach((tree, index) => {
    tree.rotation.z =
      Math.sin(elapsed * 0.65 + index) * 0.018;
  });

  // Movimento das flores.

  flowers.forEach((flower, index) => {
    flower.rotation.z =
      Math.sin(elapsed * 1.3 + index) * 0.035;
  });

  renderer.render(scene, camera);
}

animate();

// ======================================================
// ESTADO DA CENA
// ======================================================

window.lumenIsland = {
  scene,
  camera,
  renderer,
  island,
  changeZoom
};

window.lumenIslandReady = true;

console.log('Lumen Society Island Core 0.3 carregado.');