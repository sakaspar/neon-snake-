/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { soundManager } from './soundManager';

declare global {
  interface Window {
    CrazyGames?: {
      SDK?: {
        init: () => Promise<void>;
        game: {
          gameplayStart: () => void;
          gameplayStop: () => void;
          loadingStart: () => void;
          loadingStop: () => void;
          happytime: () => void;
          addAudioListener?: (listener: (audioState: any) => void) => void;
          removeAudioListener?: (listener: (audioState: any) => void) => void;
        };
        ad: {
          requestAd: (
            type: 'midroll' | 'rewarded',
            callbacks: {
              adStarted?: () => void;
              adFinished?: () => void;
              adError?: (error: any) => void;
            }
          ) => void;
          hasAdblock: () => Promise<boolean>;
        };
        user: {
          isUserAccountAvailable: boolean;
          getUser: () => Promise<any>;
          showAuthPrompt: () => Promise<any>;
        };
        data: {
          setItem: (key: string, value: string) => void;
          getItem: (key: string) => string | null;
          removeItem: (key: string) => void;
        };
        banner: {
          requestBanner: (options: any) => void;
          clearBanner: (id: string) => void;
        };
      };
    };
  }
}

let isInitialized = false;
let isAdPlaying = false;
let initPromise: Promise<boolean> | null = null;

export async function initCrazyGames(): Promise<boolean> {
  if (isInitialized) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (window.CrazyGames?.SDK) {
        await window.CrazyGames.SDK.init();
        isInitialized = true;
        console.log('🎮 CrazyGames SDK v3 Initialized successfully!');
        return true;
      } else {
        console.warn('CrazyGames SDK script not found, running in standalone mode.');
        return false;
      }
    } catch (err) {
      console.error('Failed to initialize CrazyGames SDK:', err);
      return false;
    }
  })();

  return initPromise;
}

// Automatically start SDK initialization as soon as module loads
if (typeof window !== 'undefined') {
  initCrazyGames().catch(() => {});
}

export async function crazyGamesGameplayStart() {
  await initCrazyGames();
  try {
    if (isInitialized && window.CrazyGames?.SDK?.game) {
      window.CrazyGames.SDK.game.gameplayStart();
      console.log('🎮 CrazyGames: gameplayStart()');
    }
  } catch (err) {
    console.error('CrazyGames gameplayStart error:', err);
  }
}

export async function crazyGamesGameplayStop() {
  await initCrazyGames();
  try {
    if (isInitialized && window.CrazyGames?.SDK?.game) {
      window.CrazyGames.SDK.game.gameplayStop();
      console.log('🎮 CrazyGames: gameplayStop()');
    }
  } catch (err) {
    console.error('CrazyGames gameplayStop error:', err);
  }
}

export async function crazyGamesTriggerHappytime() {
  await initCrazyGames();
  try {
    if (isInitialized && window.CrazyGames?.SDK?.game) {
      window.CrazyGames.SDK.game.happytime();
      console.log('🎉 CrazyGames: happytime() triggered!');
    }
  } catch (err) {
    console.error('CrazyGames happytime error:', err);
  }
}

export async function crazyGamesRequestMidrollAd(onComplete?: () => void) {
  if (isAdPlaying) {
    if (onComplete) onComplete();
    return;
  }

  await initCrazyGames();

  if (!isInitialized || !window.CrazyGames?.SDK?.ad) {
    console.log('CrazyGames SDK not present, skipping midroll ad.');
    if (onComplete) onComplete();
    return;
  }

  isAdPlaying = true;
  soundManager.setAdMuted(true);

  window.CrazyGames.SDK.ad.requestAd('midroll', {
    adStarted: () => {
      console.log('📺 Midroll Ad Started');
      soundManager.setAdMuted(true);
    },
    adFinished: () => {
      console.log('📺 Midroll Ad Finished');
      isAdPlaying = false;
      soundManager.setAdMuted(false);
      if (onComplete) onComplete();
    },
    adError: (error) => {
      console.warn('📺 Midroll Ad Error:', error);
      isAdPlaying = false;
      soundManager.setAdMuted(false);
      if (onComplete) onComplete();
    },
  });
}

export async function crazyGamesRequestRewardedAd(
  onRewardGranted: () => void,
  onError?: (errMessage: string, canFallback?: boolean) => void
) {
  if (isAdPlaying) {
    if (onError) onError('An ad is already playing.', false);
    return;
  }

  await initCrazyGames();

  if (!isInitialized || !window.CrazyGames?.SDK?.ad) {
    console.log('CrazyGames SDK not present, granting reward directly.');
    onRewardGranted();
    return;
  }

  isAdPlaying = true;
  let rewardGiven = false;

  try {
    soundManager.setAdMuted(true);
    window.CrazyGames.SDK.ad.requestAd('rewarded', {
      adStarted: () => {
        console.log('🎁 Rewarded Ad Started');
        soundManager.setAdMuted(true);
      },
      adFinished: () => {
        console.log('🎁 Rewarded Ad Finished - Awarding item!');
        isAdPlaying = false;
        soundManager.setAdMuted(false);
        rewardGiven = true;
        onRewardGranted();
      },
      adError: (error: any) => {
        console.warn('🎁 Rewarded Ad Error:', error);
        isAdPlaying = false;
        soundManager.setAdMuted(false);

        if (!rewardGiven) {
          let errStr = typeof error === 'string' ? error : (error?.message || error?.code || JSON.stringify(error) || 'Ad unavailable');
          if (errStr === '{}') errStr = 'Ad closed or unavailable';

          const isCrazyIframe = window.self !== window.top;
          let msg = `Ad Error (${errStr}).`;
          if (isCrazyIframe) {
            msg = `CrazyGames Ad Error: ${errStr}. (In QA Tool: ensure "Skip video" setting is OFF!)`;
          } else {
            msg = `Ad Error: ${errStr}. Live ads require published CrazyGames iframe.`;
          }

          if (onError) {
            onError(msg, true);
          }
        }
      },
    });
  } catch (err) {
    console.error('Error requesting CrazyGames rewarded ad:', err);
    isAdPlaying = false;
    soundManager.setAdMuted(false);
    if (onError) {
      onError('CrazyGames Ad error on external domain.', true);
    }
  }
}

export function crazyGamesSaveData(key: string, value: string) {
  try {
    if (isInitialized && window.CrazyGames?.SDK?.data) {
      window.CrazyGames.SDK.data.setItem(key, value);
    }
  } catch (err) {
    console.error('Error saving data to CrazyGames Data API:', err);
  }
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export function crazyGamesGetData(key: string): string | null {
  try {
    if (isInitialized && window.CrazyGames?.SDK?.data) {
      const val = window.CrazyGames.SDK.data.getItem(key);
      if (val !== null) return val;
    }
  } catch (err) {
    console.error('Error getting data from CrazyGames Data API:', err);
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function crazyGamesAddAudioListener(listener: (audioState: any) => void) {
  await initCrazyGames();
  try {
    if (isInitialized && window.CrazyGames?.SDK?.game?.addAudioListener) {
      window.CrazyGames.SDK.game.addAudioListener(listener);
      console.log('🔈 Registered CrazyGames Audio Listener');
    }
  } catch (err) {
    console.error('Error registering CrazyGames audio listener:', err);
  }
}

export async function crazyGamesRemoveAudioListener(listener: (audioState: any) => void) {
  await initCrazyGames();
  try {
    if (isInitialized && window.CrazyGames?.SDK?.game?.removeAudioListener) {
      window.CrazyGames.SDK.game.removeAudioListener(listener);
      console.log('🔇 Removed CrazyGames Audio Listener');
    }
  } catch (err) {
    console.error('Error removing CrazyGames audio listener:', err);
  }
}
