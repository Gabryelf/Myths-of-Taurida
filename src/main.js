import { Game } from './core/Game.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const uiRoot = document.getElementById('ui-root');
  const toastRoot = document.getElementById('toast-root');

  try {
    const game = new Game({ canvas, uiRoot, toastRoot });
    game.input.attachCameraController(game.cameraController);
    game.start('scythians');
  } catch (err) {
    console.error(err);
    document.body.innerHTML = `<pre style="color:#f88;padding:20px">Ошибка: ${err.message}</pre>`;
  }
});