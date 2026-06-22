/**
 * Sound synthesis utility for session expiration alerts
 */
export function playBuzzerSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Play a sequence of 3 friendly notifications
    const times = [0, 0.25, 0.5];
    const notes = [587.33, 659.25, 698.46]; // D5, E5, F5 (high, pleasant warning)

    times.forEach((timeOffset, index) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(notes[index], audioCtx.currentTime + timeOffset);
      
      gain.gain.setValueAtTime(0, audioCtx.currentTime + timeOffset);
      gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + timeOffset + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + timeOffset + 0.2);
      
      osc.start(audioCtx.currentTime + timeOffset);
      osc.stop(audioCtx.currentTime + timeOffset + 0.22);
    });
  } catch (err) {
    console.warn("AudioContext is not supported/allowed in this browser environment yet.", err);
  }
}
