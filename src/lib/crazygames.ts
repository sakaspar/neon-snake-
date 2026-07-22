/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

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

export async function initCrazyGames(): Promise<boolean> {
  if (isInitialized) return true;

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
}

export function crazyGamesGameplayStart() {
  try {
    if (window.CrazyGames?.SDK?.game) {
      window.CrazyGames.SDK.game.gameplayStart();
      console.log('🎮 CrazyGames: gameplayStart()');
    }
  } catch (err) {
    console.error('CrazyGames gameplayStart error:', err);
  }
}

export function crazyGamesGameplayStop() {
  try {
    if (window.CrazyGames?.SDK?.game) {
      window.CrazyGames.SDK.game.gameplayStop();
      console.log('🎮 CrazyGames: gameplayStop()');
    }
  } catch (err) {
    console.error('CrazyGames gameplayStop error:', err);
  }
}

export function crazyGamesTriggerHappytime() {
  try {
    if (window.CrazyGames?.SDK?.game) {
      window.CrazyGames.SDK.game.happytime();
      console.log('🎉 CrazyGames: happytime() triggered!');
    }
  } catch (err) {
    console.error('CrazyGames happytime error:', err);
  }
}

export function crazyGamesRequestMidrollAd(onComplete?: () => void) {
  if (isAdPlaying) {
    if (onComplete) onComplete();
    return;
  }

  if (!window.CrazyGames?.SDK?.ad) {
    console.log('CrazyGames SDK not present, skipping midroll ad.');
    if (onComplete) onComplete();
    return;
  }

  isAdPlaying = true;
  window.CrazyGames.SDK.ad.requestAd('midroll', {
    adStarted: () => {
      console.log('📺 Midroll Ad Started');
    },
    adFinished: () => {
      console.log('📺 Midroll Ad Finished');
      isAdPlaying = false;
      if (onComplete) onComplete();
    },
    adError: (error) => {
      console.warn('📺 Midroll Ad Error:', error);
      isAdPlaying = false;
      if (onComplete) onComplete();
    },
  });
}

export function crazyGamesRequestRewardedAd(
  onRewardGranted: () => void,
  onError?: (errMessage: string) => void
) {
  if (isAdPlaying) {
    if (onError) onError('An ad is already playing.');
    return;
  }

  if (!window.CrazyGames?.SDK?.ad) {
    console.log('CrazyGames SDK not present, auto-granting reward in dev mode.');
    onRewardGranted();
    return;
  }

  isAdPlaying = true;
  let rewardGiven = false;

  window.CrazyGames.SDK.ad.requestAd('rewarded', {
    adStarted: () => {
      console.log('🎁 Rewarded Ad Started');
    },
    adFinished: () => {
      console.log('🎁 Rewarded Ad Finished - Awarding item!');
      isAdPlaying = false;
      rewardGiven = true;
      onRewardGranted();
    },
    adError: (error) => {
      console.warn('🎁 Rewarded Ad Error or Closed Early:', error);
      isAdPlaying = false;
      if (!rewardGiven && onError) {
        onError('Ad was closed or failed to play.');
      }
    },
  });
}

export function crazyGamesSaveData(key: string, value: string) {
  try {
    if (window.CrazyGames?.SDK?.data) {
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
    if (window.CrazyGames?.SDK?.data) {
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
