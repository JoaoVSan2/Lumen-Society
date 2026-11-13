import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createInitialState } from './simulation.js';

export function createStore(filePath) {
  let queue = Promise.resolve();
  async function load() {
    try { return JSON.parse(await readFile(filePath, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const initial = createInitialState();
      await save(initial);
      return initial;
    }
  }
  async function save(state) {
    const operation = async () => {
      await mkdir(dirname(filePath), { recursive: true });
      const temp = `${filePath}.tmp`;
      await writeFile(temp, JSON.stringify(state, null, 2), 'utf8');
      await rename(temp, filePath);
    };
    queue = queue.then(operation, operation);
    return queue;
  }
  return { load, save };
}
