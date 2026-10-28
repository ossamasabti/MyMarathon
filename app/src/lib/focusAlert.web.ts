// Web / desktop end-of-timer alert: no scheduled notifications in browsers, so a short chime
// is played while the page is open (Web Audio, no sound file). Same API as focusAlert.ts.

export async function scheduleFocusEnd(_at: number, _taskTitle: string | null): Promise<void> {}

export async function cancelFocusEnd(): Promise<void> {}

export function playFocusEnd(): void {
  try {
    const context = new AudioContext();
    // Three rising notes.
    [660, 880, 1100].forEach((frequency, index) => {
      const start = context.currentTime + index * 0.25;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.24);
    });
    setTimeout(() => void context.close(), 1200);
  } catch {
    // Audio unavailable (autoplay policy, no output device): the screen still shows the end.
  }
}
