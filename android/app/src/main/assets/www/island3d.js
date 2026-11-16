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

const SEGMENTS = 96;
const RINGS = 20;
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
  // Elevações principais.
  const hill1 = Math.exp(
    -((x + 1.8) ** 2 + (z + 1.5) ** 2) / 5
  ) * 0.85;

  const hill2 = Math.exp(
    -((x - 2.1) ** 2 + (z - 1.1) ** 2) / 4
  ) * 0.55;

  const hill3 = Math.exp(
    -((x + 0.3) ** 2 + (z - 3.0) ** 2) / 3
  ) * 0.3;

  // Pequenas ondulações naturais.
  const variation =
    Math.sin(x * 1.4 + z * 0.7) * 0.055 +
    Math.cos(z * 1.7 - x * 0.5) * 0.045 +
    Math.sin((x + z) * 2.1) * 0.025;

  return 0.42 + hill1 + hill2 + hill3 + variation;
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

// FINALIZAÇÃO DO TERRENO — CORES ORGÂNICAS

const topGeometry = new THREE.BufferGeometry();

topGeometry.setAttribute(
  'position',
  new THREE.Float32BufferAttribute(topVertices, 3)
);

topGeometry.setIndex(topIndices);

// CORES DO TERRENO — TRANSIÇÕES SUAVES

const baseGreen = new THREE.Color('#83b77d');
const lightGreen = new THREE.Color('#a4c987');
const darkGreen = new THREE.Color('#70966b');
const softGreen = new THREE.Color('#91b982');

const terrainColors = [];

function smoothMask(value, start, end) {
  const t = THREE.MathUtils.clamp(
    (value - start) / (end - start),
    0,
    1
  );

  return t * t * (3 - 2 * t);
}

for (let i = 0; i < topVertices.length; i += 3) {
  const x = topVertices[i];
  const z = topVertices[i + 2];

  const variation = (
    Math.sin(x * 0.75 + z * 0.35) +
    Math.cos(z * 0.65 - x * 0.4)
  ) * 0.5;

  const secondary =
    Math.sin(x * 1.1 - z * 0.8) *
    Math.cos(z * 0.9 + x * 0.3);

  const lightMask = smoothMask(variation, 0.05, 0.85);
  const darkMask = smoothMask(-variation, 0.05, 0.85);
  const softMask = smoothMask(secondary, 0.35, 0.9);

  const color = baseGreen.clone();

  color.lerp(lightGreen, lightMask * 0.22);
  color.lerp(darkGreen, darkMask * 0.17);
  color.lerp(softGreen, softMask * 0.08);

  terrainColors.push(color.r, color.g, color.b);
}

topGeometry.setAttribute(
  'color',
  new THREE.Float32BufferAttribute(terrainColors, 3)
);

topGeometry.computeVertexNormals();

const terrainMaterial = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  roughness: 1,
  flatShading: false,
  vertexColors: true
});

const terrain = new THREE.Mesh(
  topGeometry,
  terrainMaterial
);

terrain.receiveShadow = true;
terrain.castShadow = true;

island.add(terrain);

// COSTA DE AREIA

function createCoast() {
function createCoast() {
  const vertices = [];
  const indices = [];
  const uvs = [];

  // Camadas da costa: topo, encosta e parte submersa.
  const layers = [
    { radius: 1.005, depth: 0.025 },
    { radius: 1.035, depth: 0.22 },
    { radius: 1.015, depth: 0.52 },
    { radius: 0.96, depth: 0.72 }
  ];

  for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
    const layer = layers[layerIndex];

    for (let i = 0; i < SEGMENTS; i++) {
      const angle = (i / SEGMENTS) * Math.PI * 2;
      const radius = islandRadius(angle) * layer.radius;

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // A primeira camada acompanha o relevo da ilha.
      const y = layerIndex === 0
        ? terrainHeight(x, z) - layer.depth
        : 0.35 - layer.depth;

      vertices.push(x, y, z);
      uvs.push(i / SEGMENTS, layerIndex / (layers.length - 1));
    }
  }

  // Liga as camadas formando a encosta.
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

  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(uvs, 2)
  );

  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const coastMaterial = new THREE.MeshStandardMaterial({
    color: '#e5cf9e',
    roughness: 1,
    flatShading: true,
    side: THREE.DoubleSide
  });

  const coast = new THREE.Mesh(geometry, coastMaterial);

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


 // GRAMA — TUFOS NATURAIS

const grassTufts = new THREE.Group();
vegetation.add(grassTufts);

let grassSeed = 86421;

function grassRandom() {
  grassSeed = (grassSeed * 16807) % 2147483647;
  return (grassSeed - 1) / 2147483646;
}

const grassColors = [
  leafMaterials[0],
  leafMaterials[1],
  leafMaterials[2],
  lightGrassMaterial,
  darkGrassMaterial
];

function createGrassTuft(x, z, scale, variant) {
  const tuft = new THREE.Group();

  tuft.position.set(
    x,
    terrainHeight(x, z) + 0.025,
    z
  );

  tuft.scale.setScalar(scale);

  const bladeCount = 3 + (variant % 2);

  for (let i = 0; i < bladeCount; i++) {
    const angle =
      (i / bladeCount) * Math.PI * 2 +
      grassRandom() * 0.4;

    const height = 0.16 + grassRandom() * 0.16;

    const blade = new THREE.Mesh(
      new THREE.ConeGeometry(
        0.055 + grassRandom() * 0.025,
        height,
        4
      ),
      grassColors[
        Math.floor(grassRandom() * grassColors.length)
      ]
    );

    blade.position.set(
      Math.cos(angle) * 0.07,
      height * 0.5,
      Math.sin(angle) * 0.07
    );

    blade.rotation.z =
      Math.cos(angle) * 0.22;

    blade.rotation.x =
      Math.sin(angle) * 0.22;

    blade.castShadow = true;

    tuft.add(blade);
  }

  tuft.rotation.y = grassRandom() * Math.PI * 2;

  grassTufts.add(tuft);
}

// Distribuição orgânica pelo terreno.

for (let i = 0; i < 48; i++) {
  const angle = grassRandom() * Math.PI * 2;

  // Mantém os tufos afastados da borda.
  const radius = Math.sqrt(grassRandom()) * 4.7;

  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  const scale = 0.65 + grassRandom() * 0.8;

  createGrassTuft(x, z, scale, i % 5);
}

// ======================================================
// DETALHES NATURAIS — PEDRINHAS E PLANTAS RASTEIRAS
// ======================================================

let detailSeed = 48271;

function detailRandom() {
  detailSeed = (detailSeed * 16807) % 2147483647;
  return (detailSeed - 1) / 2147483646;
}

// PEDRINHAS PEQUENAS

for (let i = 0; i < 26; i++) {
  const angle = detailRandom() * Math.PI * 2;
  const radius = 1.2 + detailRandom() * 3.4;

  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  const size = 0.045 + detailRandom() * 0.065;

  const pebble = new THREE.Mesh(
    new THREE.DodecahedronGeometry(size, 0),
    rockMaterials[Math.floor(detailRandom() * rockMaterials.length)]
  );

  pebble.position.set(
    x,
    terrainHeight(x, z) + size * 0.35,
    z
  );

  pebble.rotation.set(
    detailRandom() * 2,
    detailRandom() * Math.PI * 2,
    detailRandom() * 2
  );

  pebble.scale.set(
    1 + detailRandom() * 0.5,
    0.7 + detailRandom() * 0.4,
    0.8 + detailRandom() * 0.5
  );

  pebble.castShadow = true;
  island.add(pebble);
}

// PLANTAS RASTEIRAS

for (let i = 0; i < 20; i++) {
  const angle = detailRandom() * Math.PI * 2;
  const radius = 1.0 + detailRandom() * 3.5;

  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  const plant = new THREE.Group();

  plant.position.set(
    x,
    terrainHeight(x, z) + 0.025,
    z
  );

  plant.rotation.y = detailRandom() * Math.PI * 2;

  const leafCount = 3 + Math.floor(detailRandom() * 3);

  for (let j = 0; j < leafCount; j++) {
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(
        0.045 + detailRandom() * 0.025,
        0.14 + detailRandom() * 0.10,
        4
      ),
      leafMaterials[Math.floor(detailRandom() * leafMaterials.length)]
    );

    const leafAngle = (j / leafCount) * Math.PI * 2;

    leaf.position.set(
      Math.cos(leafAngle) * 0.07,
      0.07,
      Math.sin(leafAngle) * 0.07
    );

    leaf.rotation.z = Math.cos(leafAngle) * 0.45;
    leaf.rotation.x = Math.sin(leafAngle) * 0.45;

    plant.add(leaf);
  }

  plant.scale.setScalar(0.7 + detailRandom() * 0.6);

  vegetation.add(plant);
}

function createTree(x, z, scale = 1, variant = 0) {
  const group = new THREE.Group();

  group.position.set(x, terrainHeight(x, z), z);
  group.scale.setScalar(scale);

  // Tronco com formato levemente irregular.
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.19, 0.95, 6),
    trunkMaterial
  );

  trunk.position.y = 0.45;
  trunk.rotation.z = (variant % 2 === 0 ? 1 : -1) * 0.06;
  trunk.castShadow = true;
  group.add(trunk);

  const leafColor = leafMaterials[variant % leafMaterials.length];

  // Copa principal com formatos variados.
  let crownGeometry;

  if (variant % 3 === 0) {
    crownGeometry = new THREE.IcosahedronGeometry(0.75, 1);
  } else if (variant % 3 === 1) {
    crownGeometry = new THREE.DodecahedronGeometry(0.72, 1);
  } else {
    crownGeometry = new THREE.IcosahedronGeometry(0.65, 0);
  }

  const crown = new THREE.Mesh(crownGeometry, leafColor);

  crown.position.y = 1.12;
  crown.scale.set(
    variant % 2 === 0 ? 1.0 : 0.85,
    variant % 3 === 1 ? 1.2 : 1.0,
    variant % 2 === 0 ? 0.9 : 1.05
  );

  crown.castShadow = true;
  group.add(crown);

  // Copas secundárias para dar volume.
  const clusterCount = 2 + (variant % 3);

  for (let i = 0; i < clusterCount; i++) {
    const angle = (i / clusterCount) * Math.PI * 2;
    const radius = 0.38;

    const cluster = new THREE.Mesh(
      new THREE.IcosahedronGeometry(
        0.38 + (i % 2) * 0.08,
        1
      ),
      leafMaterials[(variant + i + 1) % leafMaterials.length]
    );

    cluster.position.set(
      Math.cos(angle) * radius,
      1.0 + (i % 2) * 0.18,
      Math.sin(angle) * radius
    );

    cluster.castShadow = true;
    group.add(cluster);
  }

    vegetation.add(group);

  return group;
}

// POSIÇÕES DAS ÁRVORES


const treePositions = [
  // Bosque noroeste
  [-3.7, -1.8, 1.15],
  [-4.0, -0.4, 0.85],
  [-2.9, -2.8, 0.95],

  // Bosque nordeste
  [2.7, -2.8, 1.05],
  [3.8, -1.8, 0.85],
  [3.5, -0.3, 1.1],

  // Bosque sudoeste
  [-3.5, 2.1, 0.9],
  [-2.3, 3.3, 0.8],
  [-1.8, 2.0, 0.75],

  // Bosque sudeste
  [2.3, 2.8, 0.9],
  [3.5, 2.0, 0.8],
  [1.5, 3.7, 0.75]
];

const trees = [];

for (let i = 0; i < treePositions.length; i++) {
  const [x, z, scale] = treePositions[i];

  trees.push(
    createTree(x, z, scale, i % 4)
  );
}


 // ARBUSTOS — DISTRIBUIÇÃO ORGÂNICA

function createBush(x, z, scale = 1, variant = 0) {
  const group = new THREE.Group();

  group.position.set(x, terrainHeight(x, z), z);
  group.scale.setScalar(scale);

  const clusterCount = 3 + (variant % 2);

  for (let i = 0; i < clusterCount; i++) {
    const angle = (i / clusterCount) * Math.PI * 2;
    const radius = 0.19 + (i % 2) * 0.07;

    const bush = new THREE.Mesh(
      new THREE.IcosahedronGeometry(
        0.25 + (i % 2) * 0.06,
        1
      ),
      leafMaterials[(variant + i) % leafMaterials.length]
    );

    bush.position.set(
      Math.cos(angle) * radius,
      0.18 + (i % 2) * 0.09,
      Math.sin(angle) * radius
    );

    bush.castShadow = true;
    group.add(bush);
  }

  vegetation.add(group);
  return group;
}

// Pequenos campos de arbustos próximos aos bosques.

const bushFields = [
  { x: -3.4, z: -1.4, count: 4, radius: 0.55 },
  { x: 3.25, z: -1.5, count: 4, radius: 0.55 },
  { x: -2.8, z: 2.5, count: 4, radius: 0.55 },
  { x: 2.8, z: 2.6, count: 4, radius: 0.55 },
  { x: -0.5, z: -3.5, count: 3, radius: 0.4 }
];

// Aleatoriedade determinística.

let bushSeed = 97531;

function bushRandom() {
  bushSeed = (bushSeed * 16807) % 2147483647;
  return (bushSeed - 1) / 2147483646;
}

let bushVariant = 0;

for (const field of bushFields) {
  for (let i = 0; i < field.count; i++) {
    const angle = bushRandom() * Math.PI * 2;
    const distance = Math.sqrt(bushRandom()) * field.radius;

    const x = field.x + Math.cos(angle) * distance;
    const z = field.z + Math.sin(angle) * distance;

    const scale = 0.7 + bushRandom() * 0.45;

    createBush(x, z, scale, bushVariant++);
  }
}

 // PEDRAS — DISTRIBUIÇÃO ORGÂNICA

const rockFields = [
  { x: -3.5, z: -1.7, count: 6 },
  { x: 3.2, z: -1.5, count: 5 },
  { x: -3.0, z: 2.6, count: 6 },
  { x: 2.8, z: 2.8, count: 5 }
];

let rockSeed = 24681;

function rockRandom() {
  rockSeed = (rockSeed * 16807) % 2147483647;
  return (rockSeed - 1) / 2147483646;
}

function createRock(x, z, size, variant) {
  const geometry = variant % 2 === 0
    ? new THREE.DodecahedronGeometry(size, 0)
    : new THREE.IcosahedronGeometry(size, 0);

  const rock = new THREE.Mesh(
    geometry,
    rockMaterials[variant % rockMaterials.length]
  );

  rock.position.set(
    x,
    terrainHeight(x, z) + size * 0.45,
    z
  );

  rock.scale.set(
    0.8 + rockRandom() * 0.5,
    0.65 + rockRandom() * 0.55,
    0.8 + rockRandom() * 0.5
  );

  rock.rotation.set(
    rockRandom() * 2,
    rockRandom() * Math.PI * 2,
    rockRandom() * 2
  );

  rock.castShadow = true;
  rock.receiveShadow = true;

  island.add(rock);
}

// Pequenos agrupamentos.

let rockVariant = 0;

for (const field of rockFields) {
  for (let i = 0; i < field.count; i++) {
    const angle = rockRandom() * Math.PI * 2;
    const distance = Math.sqrt(rockRandom()) * 0.75;

    const x = field.x + Math.cos(angle) * distance;
    const z = field.z + Math.sin(angle) * distance;

    const size = 0.14 + rockRandom() * 0.16;

    createRock(x, z, size, rockVariant++);
  }
}

// Pedras isoladas em diferentes pontos.

const isolatedRocks = [
  [-4.1, 0.8],
  [-1.0, -3.9],
  [1.2, -3.8],
  [4.0, 0.7],
  [-0.7, 3.8],
  [3.8, 2.0],
  [-3.8, -2.8]
];

for (const [x, z] of isolatedRocks) {
  const size = 0.16 + rockRandom() * 0.14;

  createRock(x, z, size, rockVariant++);
}

// FLORES — DISTRIBUIÇÃO ORGÂNICA

const flowers = [];

const flowerFields = [
  { x: -2.8, z: -1.9, count: 15, radius: 0.85 },
  { x: 0.2, z: -3.3, count: 13, radius: 0.75 },
  { x: 2.8, z: 1.4, count: 15, radius: 0.8 },
  { x: -1.7, z: 3.1, count: 13, radius: 0.75 }
];

// Gerador aleatório determinístico.
let flowerSeed = 13579;

function flowerRandom() {
  flowerSeed = (flowerSeed * 16807) % 2147483647;
  return (flowerSeed - 1) / 2147483646;
}

// Criar os pequenos campos.

for (let fieldIndex = 0; fieldIndex < flowerFields.length; fieldIndex++) {
  const field = flowerFields[fieldIndex];

  for (let i = 0; i < field.count; i++) {
    const angle = flowerRandom() * Math.PI * 2;
    const distance = Math.sqrt(flowerRandom()) * field.radius;

    const x = field.x + Math.cos(angle) * distance;
    const z = field.z + Math.sin(angle) * distance;

    const flower = new THREE.Group();

    flower.position.set(
      x,
      terrainHeight(x, z),
      z
    );

    const scale = 0.75 + flowerRandom() * 0.65;
    flower.scale.setScalar(scale);

    // Haste.
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.023, 0.22, 5),
      leafMaterials[0]
    );

    stem.position.y = 0.11;
    flower.add(stem);

    // Pétalas.
    const petals = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.09, 0),
      flowerMaterials[Math.floor(
        flowerRandom() * flowerMaterials.length
      )]
    );

    petals.position.y = 0.24;
    petals.scale.set(1, 0.7, 1);
    flower.add(petals);

    // Pequena variação de posição e inclinação.
    flower.rotation.y = flowerRandom() * Math.PI * 2;
    flower.rotation.z = (flowerRandom() - 0.5) * 0.12;

    vegetation.add(flower);
    flowers.push(flower);
  }
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
  const height = cameraDistance * 1.05;

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
