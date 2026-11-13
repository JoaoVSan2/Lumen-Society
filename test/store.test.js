import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../src/store.js';
import { createInitialState } from '../src/simulation.js';

test('persiste e recupera o estado do morador', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lumen-test-'));
  try {
    const store = createStore(join(dir, 'resident.json'));
    const state = createInitialState(123456);
    state.resident.name = 'Milo Persistido';
    await store.save(state);
    const loaded = await store.load();
    assert.equal(loaded.resident.name, 'Milo Persistido');
    assert.equal(loaded.resident.lastUpdatedAt, 123456);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
