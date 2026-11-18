export function createAudio() {
  let context;
  let master;
  let engine;
  let siren;
  let ambient;
  let muted = false;
  function voice(type, frequency, volume) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type; oscillator.frequency.value = frequency; gain.gain.value = volume;
    oscillator.connect(gain).connect(master); oscillator.start();
    return { oscillator, gain };
  }
  function unlock() {
    if (!context) {
      context = new AudioContext(); master = context.createGain(); master.gain.value = 0.25; master.connect(context.destination);
      engine = voice('triangle', 45, 0); siren = voice('sine', 600, 0); ambient = voice('sine', 110, 0);
    }
    return context.resume().catch(() => {});
  }
  function blip(kind = 'ui') {
    if (!context || context.state !== 'running') return;
    const sound = voice(kind === 'shot' ? 'sawtooth' : 'sine', kind === 'shot' ? 180 : 660, kind === 'shot' ? 0.6 : 0.18);
    const now = context.currentTime;
    sound.oscillator.frequency.exponentialRampToValueAtTime(kind === 'shot' ? 35 : 990, now + 0.1);
    sound.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    sound.oscillator.stop(now + 0.15);
    sound.oscillator.onended = () => { sound.oscillator.disconnect(); sound.gain.disconnect(); };
  }
  function update(state, active) {
    if (!context) return;
    const now = context.currentTime;
    master.gain.setTargetAtTime(muted || !active ? 0 : 0.25, now, 0.05);
    engine.gain.gain.setTargetAtTime(state.vehicle ? 0.2 : 0, now, 0.1);
    engine.oscillator.frequency.setTargetAtTime(40 + state.speed * 5, now, 0.1);
    siren.gain.gain.setTargetAtTime(state.wanted && state.police?.length ? 0.12 : 0, now, 0.1);
    siren.oscillator.frequency.setTargetAtTime(650 + Math.sin(now * 6) * 240, now, 0.03);
    ambient.gain.gain.setTargetAtTime(0.025 + Math.sin(now * 0.4) * 0.01, now, 0.2);
  }
  return { unlock, blip, update, toggle() { muted = !muted; return muted; }, get muted() { return muted; }, get state() { return context?.state || 'locked'; } };
}
