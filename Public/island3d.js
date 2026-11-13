import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const host = document.getElementById('island-canvas');
if (!host) throw new Error('Elemento #island-canvas não encontrado.');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#b9d9d2');
scene.fog = new THREE.Fog('#b9d9d2', 19, 46);
const camera = new THREE.OrthographicCamera(-10, 10, 7, -7, 0.1, 100);
const initialFocus = new THREE.Vector3(0, 0, 0);
let focus = initialFocus.clone();
camera.position.set(13, 15, 13);
camera.lookAt(focus);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setSize(host.clientWidth, host.clientHeight);
host.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight('#e8f6ed', '#668b78', 2.1));
const sun = new THREE.DirectionalLight('#fff0d0', 2.4);
sun.position.set(-7, 13, 8); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); scene.add(sun);

const mat = (color, roughness = 1) => new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });
const waterMat = mat('#78b9b2'), grassMat = mat('#91bd83'), grassLight = mat('#b4cf8d');
const sandMat = mat('#e4cf9e'), woodMat = mat('#9a7654'), stoneMat = mat('#d9cfb0');
const leafMats = [mat('#54886a'), mat('#6e9e75'), mat('#83a978')];
const flowerMats = [mat('#f4dca0'), mat('#e8a6a0'), mat('#f4eee0')];
const sceneObjects = new THREE.Group(); scene.add(sceneObjects);
const builtObjects = new THREE.Group(); scene.add(builtObjects);
const builtIds = new Set();
function mesh(geometry, material, x, y, z, parent = sceneObjects) {
  const item = new THREE.Mesh(geometry, material); item.position.set(x, y, z); item.castShadow = true; item.receiveShadow = true; parent.add(item); return item;
}
function tree(x, z, scale = 1, variant = 0) {
  const group = new THREE.Group(); sceneObjects.add(group); group.position.set(x, 0.7, z); group.scale.setScalar(scale);
  mesh(new THREE.CylinderGeometry(0.13, 0.18, 0.75, 5), woodMat, 0, 0.35, 0, group);
  mesh(new THREE.IcosahedronGeometry(0.72, 0), leafMats[variant % 3], 0, 1.05, 0, group).scale.set(1, 1.1, 0.9);
  mesh(new THREE.IcosahedronGeometry(0.43, 0), leafMats[(variant + 1) % 3], 0.35, 1.38, 0.05, group);
}
function pathStone(x, z, scale = 1) { const p = mesh(new THREE.CylinderGeometry(0.25 * scale, 0.3 * scale, 0.07, 6), stoneMat, x, 0.72, z); p.rotation.y = x * 0.7; }

// Água, costa em areia e terreno elevado.
mesh(new THREE.CylinderGeometry(13, 13, 0.18, 48), waterMat, 0, -0.55, 0);
mesh(new THREE.CylinderGeometry(5.5, 5.9, 0.85, 12), sandMat, 0, -0.03, 0).scale.set(1.18, 1, 0.92);
mesh(new THREE.CylinderGeometry(5.25, 5.45, 0.55, 12), grassMat, 0, 0.36, 0).scale.set(1.18, 1, 0.92);
mesh(new THREE.SphereGeometry(3.1, 10, 7), grassLight, -0.7, 0.58, -0.55).scale.set(1.25, 0.35, 0.9);
mesh(new THREE.SphereGeometry(2.25, 9, 6), grassMat, 1.2, 0.52, 0.9).scale.set(1.1, 0.25, 0.8);

// Praça central: piso de pedra, banco e luminária.
mesh(new THREE.CylinderGeometry(1.12, 1.18, 0.09, 8), stoneMat, -0.65, 0.72, 0.15);
mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.25, 7), woodMat, -0.65, 1.34, 0.15);
mesh(new THREE.IcosahedronGeometry(0.24, 0), mat('#f2d58f'), -0.65, 2.05, 0.15);
for (const [x,z] of [[-1.25,0.9],[-0.05,0.9]]) {
  const bench = mesh(new THREE.BoxGeometry(0.72,0.12,0.22), woodMat, x,0.82,z); bench.rotation.y = -0.2;
  mesh(new THREE.BoxGeometry(0.1,0.3,0.12), woodMat,x-0.22,0.65,z);
  mesh(new THREE.BoxGeometry(0.1,0.3,0.12), woodMat,x+0.22,0.65,z);
}

// Caminhos conectam os espaços da ilha.
for (let i=0;i<7;i++) pathStone(0.15 + Math.sin(i*0.45)*0.55, 3.5-i*0.62, 1.15);
for (let i=0;i<5;i++) pathStone(-0.8-i*0.45, -0.05-i*0.48, 0.85);
for (let i=0;i<5;i++) pathStone(0.8+i*0.48, 0.3+i*0.42, 0.85);

// Cabana e pequeno jardim ao lado.
const house = new THREE.Group(); sceneObjects.add(house); house.position.set(0.8,0.72,-1.45);
mesh(new THREE.BoxGeometry(1.75,1.15,1.45),mat('#f1e4c8'),0,0.57,0,house);
const roof=mesh(new THREE.ConeGeometry(1.35,1.05,4),mat('#b87964'),0,1.72,0,house); roof.rotation.y=Math.PI/4; roof.scale.z=0.85;
mesh(new THREE.BoxGeometry(0.35,0.72,0.07),woodMat,0.18,0.36,0.75,house);
mesh(new THREE.BoxGeometry(0.32,0.3,0.06),mat('#9ec9c4'),-0.48,0.72,0.755,house);
for (let row=0;row<2;row++) for(let col=0;col<3;col++) {
  const x=2.05+col*0.34,z=-2.1+row*0.42;
  mesh(new THREE.BoxGeometry(0.28,0.1,0.34),mat('#8b7657'),x,0.76,z);
  mesh(new THREE.IcosahedronGeometry(0.14,0),flowerMats[(row+col)%3],x,0.9,z);
}

// Bosque, clareira e troncos.
tree(-3.1,-1.4,1.15,0); tree(-2.8,2.2,0.82,2); tree(-3.55,0.55,0.72,1);
tree(3.1,-1.9,0.95,1); tree(2.7,2.25,0.78,0); tree(-0.2,-3.25,0.65,1);
mesh(new THREE.CylinderGeometry(0.58,0.62,0.08,8),stoneMat,-2.7,-0.0,-0.05);
mesh(new THREE.CylinderGeometry(0.23,0.27,0.28,7),woodMat,-2.7,0.18,-0.05);

// Praia, guarda-sol e píer.
mesh(new THREE.ConeGeometry(0.72,0.25,8),mat('#e5a18a'),-3.9,0.98,2.75).rotation.x=Math.PI;
mesh(new THREE.CylinderGeometry(0.045,0.045,0.85,6),woodMat,-3.9,0.55,2.75);
for(let i=0;i<5;i++) mesh(new THREE.BoxGeometry(0.48,0.12,0.55),woodMat,4.45+i*0.42,-0.1,0.4);
for(const z of [-0.1,0.9]) mesh(new THREE.CylinderGeometry(0.08,0.08,0.75,5),woodMat,4.75,-0.05,z);

// Flores e pequenas pedras decorativas.
for(let i=0;i<19;i++) {
  const angle=i*Math.PI*2/19, x=Math.cos(angle)*(3.8+(i%2)*0.3), z=Math.sin(angle)*3.35;
  const flower=mesh(new THREE.IcosahedronGeometry(0.12,0),flowerMats[i%3],x,0.82,z); flower.scale.y=0.65;
}

// Morador geométrico Milo.
const resident=new THREE.Group(); sceneObjects.add(resident);
const skin=mat('#d7a27d'), outfit=mat('#668d78'), hair=mat('#604a3d'), dark=mat('#3c5148');
mesh(new THREE.CylinderGeometry(0.23,0.27,0.52,7),outfit,0,0.55,0,resident);
mesh(new THREE.SphereGeometry(0.25,8,6),skin,0,1,0,resident);
mesh(new THREE.SphereGeometry(0.255,8,5),hair,0,1.13,-0.045,resident).scale.set(1,0.55,1);
mesh(new THREE.BoxGeometry(0.06,0.06,0.035),dark,-0.09,1.02,0.22,resident);
mesh(new THREE.BoxGeometry(0.06,0.06,0.035),dark,0.09,1.02,0.22,resident);
const leftLeg=mesh(new THREE.CylinderGeometry(0.075,0.08,0.34,6),dark,-0.11,0.17,0,resident);
const rightLeg=mesh(new THREE.CylinderGeometry(0.075,0.08,0.34,6),dark,0.11,0.17,0,resident);
resident.position.set(-0.8,0.74,1.8);

// Pontos clicáveis da ilha. São locais de interesse visual; ainda não executam ações de jogo próprias.
const areas = [
  {id:'plaza',name:'Praça central',description:'O coração da ilha: um lugar para descansar e encontrar outros moradores.',position:[-0.65,0.9,0.15],focus:[-0.4,0,0.1],color:'#f0d99b'},
  {id:'cabin',name:'Cabana do Milo',description:'O primeiro lar do Milo. Um espaço simples que poderá ser ampliado.',position:[0.8,1.0,-1.45],focus:[0.8,0,-1.4],color:'#d99a7f'},
  {id:'garden',name:'Jardim',description:'Um cantinho florido para cultivar plantas e deixar a ilha mais acolhedora.',position:[2.4,0.95,-1.8],focus:[2.1,0,-1.7],color:'#a8c98b'},
  {id:'grove',name:'Bosque tranquilo',description:'Uma clareira cercada por árvores, ideal para explorar e coletar recursos no futuro.',position:[-2.7,0.95,-0.05],focus:[-2.6,0,-0.1],color:'#91b58a'},
  {id:'beach',name:'Praia',description:'Uma faixa de areia com vista para o mar. Futuramente, poderá receber atividades e eventos.',position:[-3.9,1.0,2.75],focus:[-3.3,0,2.3],color:'#e5c58e'},
  {id:'pier',name:'Píer',description:'O ponto de chegada à Lumen Island e a futura ligação com outras ilhas.',position:[5.2,0.8,0.4],focus:[4.5,0,0.3],color:'#9cc9c1'}
];
const hotspotMeshes=[];
for(const area of areas) {
  const marker=mesh(new THREE.SphereGeometry(0.18,10,8),new THREE.MeshStandardMaterial({color:area.color,emissive:area.color,emissiveIntensity:0.35}),...area.position);
  marker.userData.areaId=area.id; hotspotMeshes.push(marker);
  const ring=mesh(new THREE.TorusGeometry(0.25,0.035,5,16),mat('#fff7df'),area.position[0],area.position[1]-0.16,area.position[2]); ring.rotation.x=Math.PI/2;
}
const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
let pointerDown=null;
function selectArea(area) {
  focus.set(...area.focus);
  host.dispatchEvent(new CustomEvent('lumen:area-selected',{detail:area}));
  document.querySelectorAll('[data-area]').forEach(button=>button.classList.toggle('active',button.dataset.area===area.id));
}
function pick(event) {
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.x=((event.clientX-rect.left)/rect.width)*2-1;
  pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObjects(hotspotMeshes,false)[0];
  if(hit) { const area=areas.find(a=>a.id===hit.object.userData.areaId); if(area) selectArea(area); }
}
renderer.domElement.addEventListener('pointerdown',e=>{pointerDown={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointerup',e=>{if(pointerDown&&Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)<8)pick(e);pointerDown=null;});

const destinations={idle:[-0.8,1.8],walking:[0.25,2.3],socializing:[-1.8,0.35],working:[0.7,-0.65],eating:[0.1,-0.8],sleeping:[1.3,-1.3],exploring:[2.7,1.3],building:[1.9,-0.8],gathering:[-2.7,0.1]};
let target=new THREE.Vector3(-0.8,0.74,1.8),currentState='idle',lastFrame=performance.now();
function setResidentState(state){currentState=state in destinations?state:'idle';const [x,z]=destinations[currentState];target.set(x,0.74,z);}
function addBuiltStructure(item) {
  if (builtIds.has(item.id)) return;
  builtIds.add(item.id);
  const group = new THREE.Group(); builtObjects.add(group);
  const wood = mat('#9b7654'), pale = mat('#d8c49b'), green = mat('#6f9c6e'), flame = mat('#e7a45e');
  if (item.type === 'bench') {
    group.position.set(-1.55,0.75,0.95);
    mesh(new THREE.BoxGeometry(0.9,0.13,0.28),wood,0,0.42,0,group);
    for (const x of [-0.34,0.34]) { mesh(new THREE.BoxGeometry(0.12,0.42,0.13),wood,x,0.2,0,group); mesh(new THREE.BoxGeometry(0.12,0.42,0.13),wood,x,0.63,-0.1,group); }
  } else if (item.type === 'flowerbed') {
    group.position.set(2.55,0.74,-1.95);
    mesh(new THREE.BoxGeometry(1.1,0.16,0.65),wood,0,0.08,0,group);
    for (let i=0;i<5;i++) { const flower=mesh(new THREE.IcosahedronGeometry(0.13,0),flowerMats[i%flowerMats.length],-0.4+i*0.2,0.32,(i%2)*0.18,group); flower.scale.set(0.8,1.2,0.8); mesh(new THREE.ConeGeometry(0.055,0.22,5),green,-0.4+i*0.2,0.19,(i%2)*0.18,group); }
  } else if (item.type === 'campfire') {
    group.position.set(-3.35,0.73,2.7);
    mesh(new THREE.CylinderGeometry(0.48,0.52,0.12,8),pale,0,0.06,0,group);
    for (let i=0;i<3;i++) { const log=mesh(new THREE.CylinderGeometry(0.07,0.07,0.72,6),wood,0,0.17,0,group); log.rotation.z=Math.PI/2; log.rotation.y=i*Math.PI/3; }
    mesh(new THREE.ConeGeometry(0.22,0.58,6),flame,0,0.48,0,group);
  }
}
window.addEventListener('lumen:resident-state',event=>{
  setResidentState(event.detail?.state);
  for (const item of event.detail?.structures || []) addBuiltStructure(item);
});
function resize(){const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight),aspect=width/height,frustum=9.5;camera.left=-frustum*aspect/2;camera.right=frustum*aspect/2;camera.top=frustum/2;camera.bottom=-frustum/2;camera.updateProjectionMatrix();renderer.setSize(width,height);}
new ResizeObserver(resize).observe(host);resize();
function frame(now){requestAnimationFrame(frame);const delta=Math.min((now-lastFrame)/1000,0.05);lastFrame=now;
  if(['walking','exploring','building'].includes(currentState)){resident.position.lerp(target,1-Math.exp(-delta*1.8));resident.position.y=0.74+Math.sin(now*0.012)*0.035;leftLeg.rotation.x=Math.sin(now*0.012)*0.28;rightLeg.rotation.x=-leftLeg.rotation.x;}
  else{resident.position.lerp(target,1-Math.exp(-delta*2.5));resident.position.y=0.74+Math.sin(now*0.002)*0.018;leftLeg.rotation.x=rightLeg.rotation.x=0;}
  camera.position.lerp(new THREE.Vector3(focus.x+13,focus.y+15,focus.z+13),1-Math.exp(-delta*2));camera.lookAt(focus);
  renderer.render(scene,camera);
}
requestAnimationFrame(frame);
window.lumenIsland={areas,selectArea};
window.lumenIslandReady=true;
