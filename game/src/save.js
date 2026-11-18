const SAVE_KEY = 'solmaris.story.v1';

export function createSave(player, vehicles, wanted, police, missions, storage = {
  setItem: (key, value) => localStorage.setItem(key, value),
  getItem: key => localStorage.getItem(key)
}) {
  function write() {
    try {
      storage.setItem(SAVE_KEY, JSON.stringify({ version: 1, index: missions.progress.index, money: player.state.money, xp: player.state.xp }));
      return 'Saved. Completed jobs and rewards are safe; active jobs restart at Lena.';
    } catch { return 'Save unavailable: browser storage is blocked or full.'; }
  }
  function read() {
    try {
      const data = JSON.parse(storage.getItem(SAVE_KEY));
      if (!data || data.version !== 1 || !Number.isInteger(data.index) || data.index < 0 || data.index > 4 ||
        !Number.isSafeInteger(data.money) || data.money < 0 || !Number.isSafeInteger(data.xp) || data.xp < 0) return null;
      return data;
    } catch { return null; }
  }
  function restore(data) {
    vehicles.release(); wanted.clear(); police.reset(); player.keys.clear();
    Object.assign(player.state, { money: data.money, xp: data.xp, health: 100, speed: 0, recovery: 0, ammo: 12, reserve: 60, reloading: 0, yaw: 0 });
    player.state.position.set(144, 0.4, 80);
    missions.restore(data);
  }
  return { write, read, load() { const data = read(); if (!data) return 'No valid save found.'; restore(data); return 'Save loaded. Meet Lena on the coast.'; },
    newGame() { restore({ index: 0, money: 0, xp: 0 }); vehicles.cars.forEach(car => { if (!car.police) car.stolen = false; }); return 'New story started. Your previous save stays until you save again.'; } };
}
