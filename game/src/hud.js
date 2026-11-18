import { createMinimap } from './minimap.js';

export function createHud(colliders) {
  const drawMap = createMinimap(document.getElementById('minimap'), colliders);
  const health = document.getElementById('health');
  const money = document.getElementById('money');
  const wanted = document.getElementById('wanted');
  const speed = document.getElementById('speed');
  const district = document.getElementById('district-name');
  return function update(state) {
    health.value = state.health;
    money.textContent = `$${state.money.toLocaleString('en-US')}`;
    document.getElementById('xp').textContent = `${state.xp || 0} XP · RANK ${1 + Math.floor((state.xp || 0) / 300)}`;
    wanted.textContent = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
    wanted.setAttribute('aria-label', `Wanted level ${state.wanted} of 5`);
    speed.textContent = `${Math.round(state.speed * 3.6)} KM/H`;
    document.getElementById('pursuit').textContent = state.bust > 0 ? `BUSTING ${Math.round(state.bust * 100)}% — MOVE!` : state.pursuit || 'CLEAR';
    document.getElementById('weapon').textContent = state.vehicle ? 'COMBAT ON FOOT ONLY' : `${state.weapon} ${state.weapon === 'PISTOL' ? `${state.ammo} / ${state.reserve}` : ''}${state.reloading ? ' · RELOADING' : ''} · Q SWITCH`;
    district.textContent = state.position.x > 150 ? 'Sunline Promenade' : state.position.x > 60 ? 'East Solmaris' : 'Downtown';
    drawMap(state);
  };
}
