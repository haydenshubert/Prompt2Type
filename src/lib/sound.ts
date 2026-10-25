let ctx: AudioContext | null = null;

/** Tiny synthesized key click; no audio assets needed. */
export function playClick(error = false) {
  try {
    ctx ??= new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = error ? 'square' : 'triangle';
    osc.frequency.value = error ? 140 : 520 + Math.random() * 60;
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch {
    // Audio is optional; ignore failures (autoplay policy, no device).
  }
}
