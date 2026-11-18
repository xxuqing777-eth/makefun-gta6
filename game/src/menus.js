export function createMenus(save, audio, controls) {
  const message = document.getElementById('save-message');
  const load = document.getElementById('load-button');
  load.disabled = !save.read();
  document.addEventListener('pointerlockchange', () => { load.disabled = !save.read(); });
  document.getElementById('save-button').addEventListener('click', () => {
    message.textContent = controls.started ? save.write() : 'Enter the city before saving.';
    load.disabled = !save.read();
    audio.blip();
  });
  load.addEventListener('click', () => { message.textContent = save.load(); audio.blip(); });
  let confirmNew = false;
  document.getElementById('new-button').addEventListener('click', event => {
    if (!confirmNew) { confirmNew = true; event.target.textContent = 'CONFIRM NEW STORY'; return; }
    message.textContent = save.newGame(); confirmNew = false; event.target.textContent = 'NEW STORY'; audio.blip();
  });
  document.getElementById('mute-button').addEventListener('click', event => {
    audio.unlock(); event.target.textContent = audio.toggle() ? 'SOUND: OFF' : 'SOUND: ON';
  });
  document.getElementById('start-button').addEventListener('click', () => { load.disabled = !save.read(); });
}
