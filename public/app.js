const $ = (id) => document.getElementById(id);
const labels = { energy: 'Energia', companionship: 'Companhia', fun: 'Diversão', food: 'Alimentação', comfort: 'Conforto' };
const colors = { energy: '#d5ad67', companionship: '#83a6a1', fun: '#a995c2', food: '#88ad83', comfort: '#d19a83' };
const icons = { idle: '⌂', walking: '↗', socializing: '☻', working: '✎', eating: '⌁', sleeping: '☾', exploring: '⌖', building: '⚒', gathering: '🧺' };
let busy = false;
const API_BASE = String(window.LUMEN_API_BASE || '').replace(/\/$/, '');
let demoState = null;
function demoInitialState() {
  const now = Date.now();
  return { schemaVersion:1, resident:{ id:'resident-001', name:'Milo', state:'idle', needs:{energy:76,companionship:64,fun:82,food:84,comfort:80}, activity:{label:'Aproveitando a tranquilidade',progress:0}, position:{area:'Praça central'}, inventory:{wood:12,stone:6,food:4}, taskQueue:[],pausedTasks:[],completedTasks:[],structures:[],totalSimulatedSeconds:0 }, world:{name:'Lumen Island',day:1}, meta:{revision:1}, _last:now, _seq:1 };
}
const demoDefinitions = {
  gather_wood:{title:'Coletar madeira',duration:18,state:'gathering',reward:{wood:3}},
  gather_stone:{title:'Procurar pedras',duration:18,state:'gathering',reward:{stone:2}},
  gather_food:{title:'Colher alimentos',duration:18,state:'gathering',reward:{food:2}},
  build:{title:'Construir estrutura',duration:28,state:'building'} ,
  explore:{title:'Explorar a ilha',duration:22,state:'exploring'},
  socialize:{title:'Procurar companhia',duration:20,state:'socializing'},
  work:{title:'Realizar um trabalho',duration:24,state:'working'}
};
function demoAdvance() {
  if (!demoState) demoState = demoInitialState();
  const r=demoState.resident, now=Date.now(), elapsed=Math.max(1,Math.min(5,(now-demoState._last)/1000)); demoState._last=now;
  r.totalSimulatedSeconds += elapsed;
  r.needs.energy=Math.max(0,r.needs.energy-elapsed*0.025); r.needs.food=Math.max(0,r.needs.food-elapsed*0.018); r.needs.fun=Math.max(0,r.needs.fun-elapsed*0.008);
  const task=r.taskQueue[0];
  if(task){ task.progressSeconds=Math.min(task.durationSeconds,task.progressSeconds+elapsed); r.state=task.type==='build'?'building':(demoDefinitions[task.type]?.state||'working'); r.activity={label:task.title,progress:task.progressSeconds/task.durationSeconds*100};
    if(task.progressSeconds>=task.durationSeconds){
      if(task.reward) for(const [key,value] of Object.entries(task.reward)) r.inventory[key]+=value;
      if(task.type==='build') { const id=task.structureId; const names={bench:'Banco de jardim',flowerbed:'Canteiro florido',campfire:'Fogueira'}; r.structures.push({id:`structure-${demoState._seq++}`,type:id,name:names[id]||'Construção',area:id==='campfire'?'Praia':'Jardim'}); }
      if(task.type==='socialize') r.needs.companionship=Math.min(100,r.needs.companionship+18);
      if(task.type==='explore') r.needs.fun=Math.min(100,r.needs.fun+12);
      r.completedTasks.push(task); r.taskQueue.shift(); if(r.taskQueue[0]) r.taskQueue[0].status='active';
    }
  } else { r.state='idle'; r.activity={label:'Aproveitando a tranquilidade',progress:0}; }
  demoState.meta.revision++; return demoState;
}
async function api(path, options = {}) {
  if (window.LUMEN_DEMO_MODE) {
    const state=demoAdvance();
    if(path==='/api/resident') return state;
    if(path==='/api/tasks' && options.method==='POST') {
      const payload=JSON.parse(options.body||'{}'), def=demoDefinitions[payload.type]; if(!def) throw new Error('Atividade não disponível nesta demonstração.');
      const costs={bench:{wood:5,stone:2},flowerbed:{wood:3,food:2},campfire:{wood:4,stone:3}};
      if(payload.type==='build'){ const cost=costs[payload.structureId]; if(!cost) throw new Error('Construção desconhecida.'); for(const [key,value] of Object.entries(cost)) if(state.resident.inventory[key]<value) throw new Error('Materiais insuficientes para esta construção.'); for(const [key,value] of Object.entries(cost)) state.resident.inventory[key]-=value; }
      state.resident.taskQueue.push({id:`demo-task-${state._seq++}`,type:payload.type,structureId:payload.structureId,status:state.resident.taskQueue.length?'queued':'active',title:payload.title||({bench:'Construir banco de jardim',flowerbed:'Construir canteiro florido',campfire:'Construir fogueira'}[payload.structureId])||def.title,durationSeconds:def.duration,progressSeconds:0,status:'queued',reward:def.reward});
      return state;
    }
    if(path==='/api/reset') { demoState=demoInitialState(); return demoState; }
  }
  const r = await fetch(`${API_BASE}${path}`, { headers: { 'content-type': 'application/json' }, ...options }); const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Falha na solicitação'); return data;
}
function render(s) {
  const r = s.resident; $('resident-name').textContent = r.name; $('day').textContent = s.world.day;
  $('activity-label').textContent = r.activity.label; $('activity-state').textContent = `Estado: ${r.state}`; $('activity-icon').textContent = icons[r.state] || '✦'; $('activity-progress').style.width = `${Math.min(100, r.activity.progress || 0)}%`;
  $('mood').textContent = Math.min(...Object.values(r.needs)) < 20 ? '☁' : '☀';
  $('last-update').textContent = `Simulado: ${Math.floor(r.totalSimulatedSeconds / 60)} min`;
  $('wood').textContent = r.inventory.wood; $('stone').textContent = r.inventory.stone; $('food').textContent = r.inventory.food;
  const structures = r.structures || []; $('structure-count').textContent = structures.length;
  $('structure-list').innerHTML = structures.length ? structures.map(item => `<div class="structure-item"><span>✦</span><div><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.area)} · concluído</small></div></div>`).join('') : '<p class="empty">Ainda não há construções novas. O primeiro projeto pode começar quando quiser.</p>';
  $('needs').innerHTML = Object.entries(r.needs).map(([key, value]) => `<div class="need-row"><span class="need-label">${labels[key]}</span><div class="bar"><span style="width:${value}%;background:${colors[key]}"></span></div><span class="need-value">${Math.round(value)}</span></div>`).join('');
  const tasks = [...r.taskQueue, ...r.pausedTasks.map(t => ({...t, status:'paused'}))]; $('task-count').textContent = tasks.length;
  $('task-list').innerHTML = tasks.length ? tasks.map(t => `<div class="task-item"><div>${escapeHtml(t.title)}<small>${t.status === 'paused' ? 'Pausada por necessidade' : t.status === 'queued' ? 'Aguardando na rotina' : 'Em andamento'}</small></div><b>${Math.round(t.progressSeconds / t.durationSeconds * 100)}%</b></div>`).join('') : '<p class="empty">Nenhuma tarefa por enquanto. Milo está livre para decidir.</p>';
  $('connection').textContent = window.LUMEN_DEMO_MODE ? 'Demonstração local' : 'Conectado ao Simulation Core';
  window.dispatchEvent(new CustomEvent('lumen:resident-state', { detail: { state: r.state, position: r.position, structures: r.structures || [] } }));
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
async function refresh() { if (busy) return; busy = true; try { render(await api('/api/resident')); } catch (e) { $('connection').textContent = 'Reconectando...'; } finally { busy = false; } }
$('refresh').addEventListener('click', refresh);
$('task-form').addEventListener('submit', async e => { e.preventDefault(); const button = e.submitter; button.disabled = true; $('task-message').textContent = 'Enviando...'; try { const result = await api('/api/tasks', { method:'POST', body:JSON.stringify({ type:$('task-type').value, title:$('task-title').value }) }); render(result); $('task-title').value = ''; $('task-message').textContent = 'Tarefa adicionada à rotina do Milo.'; } catch (err) { $('task-message').textContent = err.message; } finally { button.disabled = false; } });
import('./island3d.js').catch(error => { console.error('Falha ao iniciar a cena 3D:', error); const host = $('island-canvas'); if (host) host.innerHTML = '<p class="scene-error">Não foi possível carregar a cena 3D. Verifique sua conexão e recarregue a página.</p>'; });
refresh(); setInterval(refresh, 5000);


// Navegação entre pontos de interesse da ilha (apenas apresentação nesta versão).
const areaDescription = $('area-description');
const areaCopy = {
  plaza: 'O coração da ilha: um lugar para descansar e encontrar outros moradores.',
  cabin: 'O primeiro lar do Milo. Um espaço simples que poderá ser ampliado.',
  garden: 'Um cantinho florido para cultivar plantas e deixar a ilha mais acolhedora.',
  grove: 'Uma clareira cercada por árvores, ideal para explorar e coletar recursos no futuro.',
  beach: 'Uma faixa de areia com vista para o mar. Futuramente, poderá receber atividades e eventos.',
  pier: 'O ponto de chegada à Lumen Island e a futura ligação com outras ilhas.'
};
document.querySelectorAll('[data-area]').forEach(button => button.addEventListener('click', () => {
  const area = window.lumenIsland?.areas?.find(item => item.id === button.dataset.area);
  if (area && window.lumenIsland) window.lumenIsland.selectArea(area);
  else { document.querySelectorAll('[data-area]').forEach(item => item.classList.toggle('active', item === button)); areaDescription.textContent = areaCopy[button.dataset.area] || ''; }
}));
$('island-canvas')?.addEventListener('lumen:area-selected', event => {
  areaDescription.textContent = event.detail.description;
});
async function queueAction(type, messageId, extra = {}) {
  const message = $(messageId); message.textContent = 'Adicionando à rotina...';
  document.querySelectorAll(`[data-task="${type}"], [data-build="${extra.structureId || ''}"]`).forEach(button => button.disabled = true);
  try { render(await api('/api/tasks', { method: 'POST', body: JSON.stringify({ type, ...extra }) })); message.textContent = 'Atividade adicionada à rotina do Milo.'; }
  catch (error) { message.textContent = error.message; }
  finally { document.querySelectorAll('.secondary-button').forEach(button => button.disabled = false); }
}
document.querySelectorAll('[data-task]').forEach(button => button.addEventListener('click', () => queueAction(button.dataset.task, 'action-message')));
document.querySelectorAll('[data-build]').forEach(button => button.addEventListener('click', () => queueAction('build', 'build-message', { structureId: button.dataset.build })));

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(error => console.warn('PWA indisponível:', error)));
}
