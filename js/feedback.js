let _ctx = null;

export async function initAudio() {
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return false;
  if (!_ctx) _ctx = new AC();
  if (_ctx.state === 'suspended') await _ctx.resume();
  return _ctx.state === 'running';
}

function jouerTone(freq, dureeSec, delaySec) {
  if (delaySec === undefined) delaySec = 0;
  if (!_ctx) return;
  const t = _ctx.currentTime + delaySec;
  const osc = _ctx.createOscillator();
  const gain = _ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.7, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dureeSec);
  osc.connect(gain);
  gain.connect(_ctx.destination);
  osc.start(t);
  osc.stop(t + dureeSec + 0.01);
}

export function jouerSon(resultat) {
  switch (resultat.resultat) {
    case 'RIEN':
      break;
    case 'OK':
      jouerTone(880, 0.120);
      break;
    case 'DEJA_POINTE':
      jouerTone(660, 0.080, 0);
      jouerTone(660, 0.080, 0.180);
      break;
    case 'ERREUR':
      jouerTone(220, 0.300);
      break;
    case 'HORS_SESSION':
      jouerTone(440, 0.200);
      break;
  }
}

export function vibrer(resultat) {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  switch (resultat.resultat) {
    case 'OK':
      navigator.vibrate(50);
      break;
    case 'DEJA_POINTE':
      navigator.vibrate([30, 100, 30]);
      break;
    case 'ERREUR':
      navigator.vibrate(200);
      break;
    case 'HORS_SESSION':
    case 'RIEN':
      break;
  }
}

export function feedback(resultat) {
  jouerSon(resultat);
  vibrer(resultat);
}
