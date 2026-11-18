import { CITY } from './config.js';

export function createMinimap(canvas, colliders) {
  const context = canvas.getContext('2d');
  const size = canvas.width;
  const scale = size / 140;
  return function draw(state) {
    context.fillStyle = '#173c3f';
    context.fillRect(0, 0, size, size);
    context.save();
    context.translate(size / 2 - state.position.x * scale, size / 2 - state.position.z * scale);
    context.scale(scale, scale);
    context.fillStyle = '#247889';
    context.fillRect(214, -700, 900, 1400);
    context.fillStyle = '#b8a77a';
    context.fillRect(174, -500, 40, 1000);
    context.fillStyle = '#50676a';
    for (let road = CITY.min; road <= CITY.max; road += CITY.blockSize) {
      context.fillRect(road - 6, -150, 12, 300);
      context.fillRect(-150, road - 6, 300, 12);
    }
    context.fillStyle = '#8b9d91';
    for (const bounds of colliders) context.fillRect(bounds.min.x, bounds.min.z, bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z);
    context.fillStyle = '#ff637a';
    for (const position of state.police || []) {
      context.beginPath();
      context.arc(position.x, position.z, 2.3, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
    if (state.missionMarker) {
      const offsetX = (state.missionMarker.x - state.position.x) * scale;
      const offsetZ = (state.missionMarker.z - state.position.z) * scale;
      const clamp = Math.min(1, (size / 2 - 16) / Math.max(1, Math.hypot(offsetX, offsetZ)));
      context.fillStyle = '#ffdf8b';
      context.beginPath();
      context.arc(size / 2 + offsetX * clamp, size / 2 + offsetZ * clamp, 6, 0, Math.PI * 2);
      context.fill();
    }
    context.save();
    context.translate(size / 2, size / 2);
    context.rotate(-state.yaw);
    context.fillStyle = '#ffdf8b';
    context.strokeStyle = '#112e36';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, -10);
    context.lineTo(7, 8);
    context.lineTo(0, 4);
    context.lineTo(-7, 8);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
    context.fillStyle = '#fff4d9';
    context.font = 'bold 13px Arial';
    context.fillText('N', size / 2 - 5, 17);
  };
}
