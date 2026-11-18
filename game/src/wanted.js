export function createWanted(state) {
  let heat = 0;
  let quiet = 0;
  const lastKnown = state.position.clone();
  function crime(amount = 1) {
    heat = Math.min(5, heat + amount);
    quiet = 0;
    lastKnown.copy(state.position);
    state.wanted = Math.ceil(heat);
    state.pursuit = 'CRIME REPORTED';
  }
  function update(delta, seen) {
    if (!heat) { state.pursuit = 'CLEAR'; return; }
    if (seen) {
      quiet = 0;
      lastKnown.copy(state.position);
      state.pursuit = 'SPOTTED — BREAK LINE OF SIGHT';
    } else {
      quiet += delta;
      state.pursuit = `HIDDEN — ${Math.max(0, Math.ceil(12 - quiet))}s TO COOL DOWN`;
      if (quiet >= 12) {
        heat = Math.max(0, Math.ceil(heat) - 1);
        quiet = 0;
      }
    }
    state.wanted = Math.ceil(heat);
    if (!heat) state.pursuit = 'ESCAPED — STAY CLEAN';
  }
  function clear() { heat = 0; quiet = 0; state.wanted = 0; state.bust = 0; state.pursuit = 'CLEAR'; }
  return { crime, update, clear, lastKnown };
}
