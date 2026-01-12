let audioInitialized = false;
let audioContextAllowed = false;

const RAID_COUNTDOWN_NOTES = [523.25, 659.25, 783.99, 1046.50];

function isAudioSupported(): boolean {
  return typeof window !== 'undefined' && 
         (typeof window.AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined');
}

function createAudioContext(): AudioContext | null {
  if (!isAudioSupported()) return null;
  
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    
    audioContextAllowed = true;
    return ctx;
  } catch (e) {
    return null;
  }
}

export function initializeAudio() {
  if (audioInitialized) return;
  audioInitialized = true;
}

export function playRaidCountdown() {
  const ctx = createAudioContext();
  if (!ctx) return;

  RAID_COUNTDOWN_NOTES.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    const startTime = ctx.currentTime + (i * 0.15);
    const duration = 0.12;
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  });

  setTimeout(() => ctx.close(), 1000);
}

export function playRewardSound() {
  const ctx = createAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
  
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'triangle';
    osc.frequency.value = freq;
    
    const startTime = ctx.currentTime + (i * 0.08);
    const duration = 0.15;
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  });

  setTimeout(() => ctx.close(), 1500);
}

export function playClickSound() {
  const ctx = createAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = 'sine';
  osc.frequency.value = 800;
  
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.05);

  setTimeout(() => ctx.close(), 200);
}

export function playReadySound() {
  const ctx = createAudioContext();
  if (!ctx) return;

  const notes = [659.25, 783.99];
  
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    const startTime = ctx.currentTime + (i * 0.1);
    
    gain.gain.setValueAtTime(0.2, startTime);
    gain.gain.linearRampToValueAtTime(0, startTime + 0.1);
    
    osc.start(startTime);
    osc.stop(startTime + 0.1);
  });

  setTimeout(() => ctx.close(), 500);
}
