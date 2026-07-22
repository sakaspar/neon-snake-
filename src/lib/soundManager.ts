/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { crazyGamesAddAudioListener } from './crazygames';

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isUserMuted = false;
  private isCrazyGamesMuted = false;
  private crazyGamesVolume = 1;
  private isAdMuted = false;
  private eatPitchCounter = 0;
  private lastEatTime = 0;

  constructor() {
    // Lazy AudioContext initialization on first user interaction
    if (typeof window !== 'undefined') {
      const initAudio = () => {
        this.getAudioContext();
        window.removeEventListener('pointerdown', initAudio);
        window.removeEventListener('keydown', initAudio);
        window.removeEventListener('touchstart', initAudio);
      };
      window.addEventListener('pointerdown', initAudio);
      window.addEventListener('keydown', initAudio);
      window.addEventListener('touchstart', initAudio);

      // Register CrazyGames Audio Listener
      crazyGamesAddAudioListener((audioState) => {
        let muted = false;
        let vol = 1;

        if (typeof audioState === 'boolean') {
          muted = audioState;
        } else if (audioState && typeof audioState === 'object') {
          muted = !!(audioState.isMuted ?? audioState.mute);
          if (typeof audioState.volume === 'number') {
            vol = audioState.volume;
          }
        }

        console.log(`🔊 CrazyGames Audio Listener event: muted=${muted}, vol=${vol}`);
        this.setCrazyGamesMute(muted, vol);
      });
    }
  }

  private getAudioContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.updateMasterVolume();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setCrazyGamesMute(muted: boolean, volume = 1) {
    this.isCrazyGamesMuted = muted;
    this.crazyGamesVolume = volume;
    this.updateMasterVolume();
  }

  public setAdMuted(muted: boolean) {
    this.isAdMuted = muted;
    this.updateMasterVolume();
  }

  public setUserMuted(muted: boolean) {
    this.isUserMuted = muted;
    this.updateMasterVolume();
  }

  public toggleUserMute(): boolean {
    this.setUserMuted(!this.isUserMuted);
    return this.isUserMuted;
  }

  public isMuted(): boolean {
    return this.isUserMuted || this.isCrazyGamesMuted || this.isAdMuted;
  }

  private updateMasterVolume() {
    if (!this.masterGain || !this.ctx) return;
    const effectiveMuted = this.isMuted();
    const targetVol = effectiveMuted ? 0 : Math.max(0, Math.min(1, this.crazyGamesVolume * 0.3));
    this.masterGain.gain.setValueAtTime(targetVol, this.ctx.currentTime);
  }

  // Play a quick retro eating blip
  public playEatSound() {
    if (this.isMuted()) return;
    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;

    // Reset pitch counter if gap between eats is > 0.8s
    if (now - this.lastEatTime > 0.8) {
      this.eatPitchCounter = 0;
    }
    this.lastEatTime = now;
    this.eatPitchCounter = (this.eatPitchCounter + 1) % 12;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Pentatonic pitch steps
    const baseFreq = 440;
    const freqMultiplier = Math.pow(2, (this.eatPitchCounter * 2) / 12);
    const startFreq = baseFreq * freqMultiplier;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 1.5, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Play a spawn / join chime
  public playSpawnSound() {
    if (this.isMuted()) return;
    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const freqs = [329.63, 440, 554.37, 659.25]; // E4, A4, C#5, E5 arpeggio

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      gain.gain.setValueAtTime(0.12, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.25);
    });
  }

  // Play a death explosion sound
  public playDeathSound() {
    if (this.isMuted()) return;
    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;

    // Low pitch saw drop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Play UI button tap sound
  public playClickSound() {
    if (this.isMuted()) return;
    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.04);
  }
}

export const soundManager = new SoundManager();
