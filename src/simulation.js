export const NEEDS = ['energy', 'companionship', 'fun', 'food', 'comfort'];
export const STATES = ['idle', 'walking', 'socializing', 'working', 'eating', 'sleeping', 'exploring', 'building', 'gathering'];

const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const clone = (value) => structuredClone(value);

export function createInitialState(now = Date.now()) {
  return {
    schemaVersion: 1,
    resident: {
      id: 'resident-001', name: 'Milo', species: 'human', appearance: { body: 'default', hair: 'chestnut', outfit: 'sage' },
      personality: { sociability: 0.65, curiosity: 0.7, diligence: 0.55 },
      needs: { energy: 82, companionship: 66, fun: 74, food: 88, comfort: 80 },
      state: 'idle', activity: { type: 'idle', label: 'Observando a ilha', startedAt: now, endsAt: now + 15000, progress: 0 },
      position: { x: 0, y: 0, area: 'Praça central' },
      inventory: { wood: 12, stone: 6, food: 4 }, structures: [],
      taskQueue: [], pausedTasks: [], completedTasks: [],
      createdAt: now, lastUpdatedAt: now, totalSimulatedSeconds: 0
    },
    world: { name: 'Lumen Island', day: 1, weather: 'sunny', lastTickAt: now },
    meta: { lastCatchUpSeconds: 0, catchUpCapped: false, revision: 1 }
  };
}

const ACTIVITY = {
  idle: { duration: 15, label: 'Descansando um pouco', needs: { comfort: 0.08, energy: 0.025 } },
  walking: { duration: 12, label: 'Caminhando pela ilha', needs: { energy: -0.025, fun: 0.008 } },
  socializing: { duration: 90, label: 'Conversando com alguém', needs: { companionship: 0.34, fun: 0.12, energy: -0.035, food: -0.025 } },
  working: { duration: 120, label: 'Trabalhando', needs: { energy: -0.055, food: -0.045, fun: -0.018 } },
  eating: { duration: 35, label: 'Fazendo uma refeição', needs: { food: 0.85, comfort: 0.08 } },
  sleeping: { duration: 240, label: 'Dormindo tranquilamente', needs: { energy: 0.34, comfort: 0.12 } },
  exploring: { duration: 100, label: 'Explorando a ilha', needs: { fun: 0.18, companionship: -0.012, energy: -0.04, food: -0.03 } },
  building: { duration: 180, label: 'Construindo algo novo', needs: { energy: -0.045, food: -0.035, fun: 0.025, comfort: -0.012 } },
  gathering: { duration: 120, label: 'Coletando recursos', needs: { energy: -0.035, food: -0.025, fun: 0.035, comfort: -0.005 } }
};

function taskState(type) { return ({ build: 'building', explore: 'exploring', socialize: 'socializing', work: 'working', gather_wood: 'gathering', gather_stone: 'gathering', gather_food: 'gathering' })[type] ?? type; }

function startActivity(resident, type, now, task = null) {
  type = task ? taskState(task.type) : type;
  const spec = ACTIVITY[type];
  const duration = task ? task.durationSeconds : spec.duration;
  resident.state = type;
  resident.activity = { type, label: task?.title ?? spec.label, startedAt: now, endsAt: now + duration * 1000, progress: 0, taskId: task?.id ?? null, targetTaskId: null };
}

function urgentNeed(resident) {
  const n = resident.needs;
  if (n.food <= 12 && resident.inventory.food > 0) return 'eating';
  if (n.energy <= 10) return 'sleeping';
  if (n.comfort <= 8) return 'idle';
  if (n.companionship <= 8) return 'socializing';
  if (n.fun <= 7) return 'exploring';
  return null;
}

export function chooseActivity(resident) {
  const n = resident.needs;
  if (n.food < 25 && resident.inventory.food > 0) return 'eating';
  if (n.energy < 23) return 'sleeping';
  if (n.comfort < 18) return 'idle';
  if (resident.taskQueue.length) return taskState(resident.taskQueue[0].type);
  if (n.companionship < 35) return 'socializing';
  if (n.fun < 35) return 'exploring';
  if (n.food < 48 && resident.inventory.food > 0) return 'eating';
  if (n.energy < 48) return 'sleeping';
  return resident.personality.curiosity > 0.6 ? 'exploring' : 'working';
}

function applyNeeds(resident, type, seconds) {
  const rates = ACTIVITY[type].needs;
  const baseline = { energy: -0.006, companionship: -0.004, fun: -0.003, food: -0.008, comfort: -0.002 };
  for (const key of NEEDS) {
    const rate = rates[key] ?? baseline[key];
    resident.needs[key] = Math.round(clamp(resident.needs[key] + rate * seconds) * 10) / 10;
  }
}

function progressTask(resident, seconds, now) {
  const task = resident.taskQueue[0];
  if (!task) return;
  task.progressSeconds = Math.min(task.durationSeconds, task.progressSeconds + seconds);
  task.updatedAt = now;
  if (task.progressSeconds >= task.durationSeconds) {
    resident.completedTasks.unshift({ ...task, status: 'completed', completedAt: now });
    resident.completedTasks = resident.completedTasks.slice(0, 20);
    resident.taskQueue.shift();
    if (task.type === 'build') {
      resident.inventory.wood = Math.max(0, resident.inventory.wood - (task.cost?.wood ?? 0));
      resident.inventory.stone = Math.max(0, resident.inventory.stone - (task.cost?.stone ?? 0));
      resident.inventory.food = Math.max(0, resident.inventory.food - (task.cost?.food ?? 0));
      resident.structures ??= [];
      if (task.structure) resident.structures.push({ id: `${task.structure.id}-${now}`, type: task.structure.id, name: task.structure.name, area: task.structure.area, builtAt: now });
    }
    if (task.type === 'gather_wood') resident.inventory.wood += task.reward;
    if (task.type === 'gather_stone') resident.inventory.stone += task.reward;
    if (task.type === 'gather_food') resident.inventory.food += task.reward;
  }
}

export function advanceState(input, targetTime = Date.now(), options = {}) {
  const state = clone(input);
  const resident = state.resident;
  resident.structures ??= [];
  resident.inventory ??= { wood: 0, stone: 0, food: 0 };
  resident.taskQueue ??= []; resident.pausedTasks ??= []; resident.completedTasks ??= [];
  const maxCatchUpSeconds = options.maxCatchUpSeconds ?? 7 * 24 * 60 * 60;
  const elapsedRaw = Math.max(0, Math.floor((targetTime - resident.lastUpdatedAt) / 1000));
  const elapsed = Math.min(elapsedRaw, maxCatchUpSeconds);
  const stepSeconds = options.stepSeconds ?? 60;
  let remaining = elapsed;
  let cursor = resident.lastUpdatedAt;
  while (remaining > 0) {
    const step = Math.min(stepSeconds, remaining);
    cursor += step * 1000;
    const urgent = urgentNeed(resident);
    if (urgent && resident.state !== urgent && ['eating', 'sleeping', 'socializing', 'exploring', 'idle'].includes(urgent)) {
      if (resident.activity.taskId && resident.taskQueue[0]) resident.pausedTasks.unshift(resident.taskQueue.shift());
      startActivity(resident, urgent, cursor);
    }
    if (resident.activity.endsAt <= cursor) {
      const destinationTask = resident.activity.targetTaskId ? resident.taskQueue.find(t => t.id === resident.activity.targetTaskId) : null;
      if (resident.state === 'eating') { resident.needs.food = clamp(resident.needs.food + 15); if (resident.inventory.food > 0) resident.inventory.food -= 1; }
      if (resident.state === 'sleeping') resident.needs.energy = clamp(resident.needs.energy + 20);
      if (resident.state === 'socializing') resident.needs.companionship = clamp(resident.needs.companionship + 12);
      if (resident.state === 'exploring') resident.needs.fun = clamp(resident.needs.fun + 8);
      if (resident.activity.taskId) progressTask(resident, step, cursor);
      if (resident.pausedTasks.length && !urgentNeed(resident)) resident.taskQueue.unshift(resident.pausedTasks.shift());
      if (destinationTask) { startActivity(resident, taskState(destinationTask.type), cursor, destinationTask); remaining -= step; continue; }
      const next = chooseActivity(resident);
      const task = resident.taskQueue[0] ?? null;
      if (task && next === taskState(task.type)) { startActivity(resident, 'walking', cursor); resident.activity.targetTaskId = task.id; }
      else startActivity(resident, next, cursor);
    } else {
      applyNeeds(resident, resident.state, step);
      if (resident.activity.taskId) progressTask(resident, step, cursor);
      const duration = Math.max(1, (resident.activity.endsAt - resident.activity.startedAt) / 1000);
      resident.activity.progress = clamp(((cursor - resident.activity.startedAt) / 1000) / duration * 100);
    }
    remaining -= step;
  }
  resident.lastUpdatedAt = targetTime;
  resident.totalSimulatedSeconds += elapsed;
  state.world.day = Math.floor(resident.totalSimulatedSeconds / 86400) + 1;
  state.world.lastTickAt = targetTime;
  state.meta.lastCatchUpSeconds = elapsed;
  state.meta.catchUpCapped = elapsedRaw > maxCatchUpSeconds;
  state.meta.revision += 1;
  return state;
}

export function enqueueTask(input, payload, now = Date.now()) {
  const state = clone(input);
  const { type, title, structureId } = payload ?? {};
  const allowed = ['build', 'explore', 'socialize', 'work', 'gather_wood', 'gather_stone', 'gather_food'];
  if (!allowed.includes(type)) throw new Error(`Tipo de tarefa inválido. Use: ${allowed.join(', ')}.`);

  const structures = {
    bench: { id: 'bench', name: 'Banco de jardim', area: 'Praça central', cost: { wood: 5, stone: 2 }, duration: 420 },
    flowerbed: { id: 'flowerbed', name: 'Canteiro florido', area: 'Jardim', cost: { wood: 3, food: 2 }, duration: 300 },
    campfire: { id: 'campfire', name: 'Fogueira', area: 'Praia', cost: { wood: 4, stone: 3 }, duration: 480 }
  };
  const structure = type === 'build' && structureId ? structures[structureId] : null;
  if (type === 'build' && structureId && !structure) throw new Error('Construção desconhecida.');
  const cost = structure?.cost ?? (type === 'build' ? { wood: 4 } : {});
  const reserved = [...state.resident.taskQueue, ...state.resident.pausedTasks].filter(t => t.type === 'build').reduce((sum, t) => ({ wood: sum.wood + (t.cost?.wood ?? 0), stone: sum.stone + (t.cost?.stone ?? 0), food: sum.food + (t.cost?.food ?? 0) }), { wood: 0, stone: 0, food: 0 });
  for (const resource of ['wood', 'stone', 'food']) {
    if ((state.resident.inventory[resource] ?? 0) - reserved[resource] < (cost[resource] ?? 0)) {
      const names = { wood: 'madeira', stone: 'pedra', food: 'comida' };
      throw new Error(resource === 'wood' ? 'Madeira insuficiente: recursos reservados ou estoque baixo.' : `Recursos insuficientes: faltam ${names[resource]}.`);
    }
  }

  const gathering = {
    gather_wood: { title: 'Coletar madeira no bosque', reward: 3, duration: 150 },
    gather_stone: { title: 'Procurar pedras na praia', reward: 2, duration: 120 },
    gather_food: { title: 'Colher alimentos no jardim', reward: 2, duration: 120 }
  }[type];
  const defaultTitles = { build: structure?.name ?? 'Construir uma pequena estrutura', explore: 'Explorar a ilha', socialize: 'Procurar companhia', work: 'Realizar um trabalho' };
  const task = {
    id: `task-${now}-${Math.random().toString(36).slice(2, 7)}`,
    type, title: String(title || gathering?.title || defaultTitles[type]).slice(0, 80),
    status: 'queued', progressSeconds: 0,
    durationSeconds: gathering?.duration ?? structure?.duration ?? (type === 'build' ? 600 : type === 'explore' ? 180 : type === 'socialize' ? 120 : 300),
    createdAt: now, updatedAt: now, cost, ...(structure ? { structure } : {}), ...(gathering ? { reward: gathering.reward } : {})
  };
  state.resident.taskQueue.push(task);
  state.meta.revision += 1;
  return state;
}
