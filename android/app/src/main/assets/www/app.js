
const host = document.getElementById('island-canvas');

if (!host) {
  throw new Error('Elemento island-canvas não encontrado.');
}

import('./island3d.js')
  .then(() => {
    console.log('Lumen Society: ilha 3D carregada.');
  })
  .catch((error) => {
    console.error('Erro ao carregar a ilha 3D:', error);

    host.innerHTML = `
      <div class="scene-error">
        Não foi possível carregar a ilha 3D.
        Verifique sua conexão com a internet e tente novamente.
      </div>
    `;
  });
