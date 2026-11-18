export function createControls(canvas, player, vehicles, combat, missions, audio) {
  const menu = document.getElementById('start-screen');
  const button = document.getElementById('start-button');
  const title = document.getElementById('menu-title');
  const hint = document.getElementById('menu-hint');
  const controls = { active: false, started: false };
  function pause() {
    controls.active = false;
    player.keys.clear();
    menu.hidden = false;
    document.getElementById('hud').hidden = true;
    if (controls.started) {
      title.textContent = 'TAKE A BREATHER.';
      button.textContent = 'BACK TO SOLMARIS';
    }
    button.focus();
  }
  button.addEventListener('click', async () => {
    audio.unlock();
    audio.blip();
    try { await canvas.requestPointerLock(); }
    catch { hint.textContent = 'Mouse capture was blocked. Click again to enter the city.'; }
  });
  document.addEventListener('pointerlockchange', () => {
    controls.active = document.pointerLockElement === canvas;
    if (controls.active) {
      controls.started = true;
      menu.hidden = true;
      document.getElementById('hud').hidden = false;
      player.keys.clear();
      document.getElementById('status').textContent = 'Exploring Solmaris as Jax Moreno.';
    } else pause();
  });
  document.addEventListener('pointerlockerror', () => { hint.textContent = 'Click to capture the mouse and continue.'; });
  document.addEventListener('mousemove', event => {
    if (controls.active) player.look(event.movementX, event.movementY);
  });
  document.addEventListener('mousedown', event => {
    if (controls.active && event.button === 0 && combat.attack()) audio.blip(player.state.weapon === 'PISTOL' ? 'shot' : 'ui');
  });
  window.addEventListener('keydown', event => {
    if (event.code === 'KeyM' && !event.repeat) {
      audio.toggle();
      document.getElementById('mute-button').textContent = audio.muted ? 'SOUND: OFF' : 'SOUND: ON';
    }
    if (event.code === 'Escape' && controls.active) {
      document.exitPointerLock();
      pause();
    }
    if (!controls.active) return;
    if (player.state.recovery > 0) return;
    if (event.code === 'KeyF' && !event.repeat) { missions.interact(); audio.blip(); }
    if (event.code === 'KeyQ' && !event.repeat) combat.switchWeapon();
    if (event.code === 'KeyR' && !event.repeat) combat.reload();
    if (event.code === 'KeyE' && !event.repeat) vehicles?.interact();
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 'Digit1', 'Digit2', 'Digit3'].includes(event.code)) {
      event.preventDefault();
      player.keys.add(event.code);
    }
  });
  window.addEventListener('keyup', event => player.keys.delete(event.code));
  window.addEventListener('blur', () => { if (controls.active) document.exitPointerLock(); pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { document.exitPointerLock(); pause(); } });
  return controls;
}
