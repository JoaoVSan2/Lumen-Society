import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, advanceState, chooseActivity, enqueueTask } from '../src/simulation.js';

const NOW = 1_800_000_000_000;
test('cria morador com cinco necessidades válidas', () => {
  const s = createInitialState(NOW);
  assert.deepEqual(Object.keys(s.resident.needs), ['energy','companionship','fun','food','comfort']);
  for (const value of Object.values(s.resident.needs)) assert.ok(value >= 0 && value <= 100);
});
test('seleciona alimentação quando a fome está baixa', () => {
  const s = createInitialState(NOW); s.resident.needs.food = 10;
  assert.equal(chooseActivity(s.resident), 'eating');
});
test('necessidades mudam com o tempo decorrido', () => {
  const s = createInitialState(NOW); const next = advanceState(s, NOW + 3600_000);
  assert.ok(next.resident.totalSimulatedSeconds > 0);
  assert.ok(next.resident.needs.food < s.resident.needs.food || next.resident.needs.energy !== s.resident.needs.energy);
});
test('fila aceita tarefa de construção e valida recursos', () => {
  const s = createInitialState(NOW); const next = enqueueTask(s, { type: 'build', title: 'Cabana' }, NOW);
  assert.equal(next.resident.taskQueue.length, 1);
  next.resident.inventory.wood = 0;
  assert.throws(() => enqueueTask(next, { type: 'build' }, NOW), /Madeira insuficiente/);
});
test('recupera tempo offline a partir de timestamp e limita catch-up', () => {
  const s = createInitialState(NOW); const next = advanceState(s, NOW + 30 * 86400_000);
  assert.equal(next.meta.lastCatchUpSeconds, 7 * 86400);
  assert.equal(next.meta.catchUpCapped, true);
  assert.equal(next.resident.lastUpdatedAt, NOW + 30 * 86400_000);
});
test('não avança o estado quando timestamp não mudou', () => {
  const s = createInitialState(NOW); const next = advanceState(s, NOW);
  assert.equal(next.resident.totalSimulatedSeconds, 0);
});
test('interrompe uma tarefa quando a alimentação fica crítica e preserva a tarefa', () => {
  const s = createInitialState(NOW);
  s.resident.needs.food = 5;
  s.resident.state = 'building';
  s.resident.activity = { type: 'building', label: 'Construindo', startedAt: NOW, endsAt: NOW + 600000, progress: 0, taskId: 'task-pause' };
  s.resident.taskQueue = [{ id: 'task-pause', type: 'build', title: 'Cabana', status: 'active', progressSeconds: 30, durationSeconds: 600, createdAt: NOW, updatedAt: NOW, cost: { wood: 4 } }];
  const next = advanceState(s, NOW + 60000);
  assert.equal(next.resident.state, 'eating');
  assert.equal(next.resident.pausedTasks[0].id, 'task-pause');
});
test('conclui tarefa quando o tempo necessário é alcançado', () => {
  const s = createInitialState(NOW);
  s.resident.state = 'working';
  s.resident.taskQueue = [{ id: 'task-work', type: 'work', title: 'Trabalho', status: 'active', progressSeconds: 0, durationSeconds: 60, createdAt: NOW, updatedAt: NOW, cost: {} }];
  s.resident.activity = { type: 'working', label: 'Trabalho', startedAt: NOW, endsAt: NOW + 60000, progress: 0, taskId: 'task-work' };
  const next = advanceState(s, NOW + 60000);
  assert.equal(next.resident.taskQueue.length, 0);
  assert.equal(next.resident.completedTasks[0].id, 'task-work');
});
test('morador caminha antes de iniciar uma tarefa solicitada', () => {
  const s = createInitialState(NOW);
  s.resident.activity = { type: 'idle', label: 'Livre', startedAt: NOW - 15000, endsAt: NOW, progress: 100, taskId: null };
  s.resident.state = 'idle';
  s.resident.taskQueue = [{ id: 'task-walk', type: 'explore', title: 'Trilha', status: 'queued', progressSeconds: 0, durationSeconds: 180, createdAt: NOW, updatedAt: NOW, cost: {} }];
  const next = advanceState(s, NOW + 1000);
  assert.equal(next.resident.state, 'walking');
  assert.equal(next.resident.activity.targetTaskId, 'task-walk');
});

test('coleta de madeira adiciona uma tarefa com recompensa definida', () => {
  const s = createInitialState(NOW);
  const next = enqueueTask(s, { type: 'gather_wood' }, NOW);
  assert.equal(next.resident.taskQueue[0].reward, 3);
  assert.equal(next.resident.taskQueue[0].durationSeconds, 150);
});

test('construção personalizada valida custo e registra a estrutura no estado da tarefa', () => {
  const s = createInitialState(NOW);
  const next = enqueueTask(s, { type: 'build', structureId: 'bench' }, NOW);
  assert.equal(next.resident.taskQueue[0].structure.name, 'Banco de jardim');
  assert.deepEqual(next.resident.taskQueue[0].cost, { wood: 5, stone: 2 });
  s.resident.inventory.stone = 0;
  assert.throws(() => enqueueTask(s, { type: 'build', structureId: 'bench' }, NOW), /pedra/);
});

test('não permite reservar materiais além do estoque para construções enfileiradas', () => {
  const s = createInitialState(NOW);
  const first = enqueueTask(s, { type: 'build', structureId: 'bench' }, NOW);
  const second = enqueueTask(first, { type: 'build', structureId: 'bench' }, NOW + 1);
  assert.throws(() => enqueueTask(second, { type: 'build', structureId: 'bench' }, NOW + 2), /[Mm]adeira/);
});


test('concluir coleta entrega recursos ao inventário', () => {
  const s = createInitialState(NOW);
  const queued = enqueueTask(s, { type: 'gather_wood' }, NOW);
  const task = queued.resident.taskQueue[0];
  queued.resident.state = 'gathering';
  queued.resident.activity = { type: 'gathering', label: task.title, startedAt: NOW, endsAt: NOW + task.durationSeconds * 1000, progress: 0, taskId: task.id };
  const done = advanceState(queued, NOW + 180_000);
  assert.equal(done.resident.inventory.wood, 15);
  assert.equal(done.resident.taskQueue.length, 0);
});

test('concluir construção registra estrutura e desconta materiais', () => {
  const s = createInitialState(NOW);
  const queued = enqueueTask(s, { type: 'build', structureId: 'flowerbed' }, NOW);
  const task = queued.resident.taskQueue[0];
  queued.resident.state = 'building';
  queued.resident.activity = { type: 'building', label: task.title, startedAt: NOW, endsAt: NOW + task.durationSeconds * 1000, progress: 0, taskId: task.id };
  const done = advanceState(queued, NOW + 360_000);
  assert.equal(done.resident.structures.length, 1);
  assert.equal(done.resident.structures[0].type, 'flowerbed');
  assert.equal(done.resident.inventory.wood, 9);
  assert.equal(done.resident.inventory.food, 2);
});
