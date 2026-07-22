/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { create } from 'zustand';
import { GameState } from '../shared/types';
import { standaloneEngine } from '../lib/gameEngine';

interface GameStore {
  gameState: GameState | null;
  playerId: string | null;
  connect: () => void;
  joinGame: (options?: { skinId?: string; bonusScore?: number }) => void;
  sendPlayerState: (data: any) => void;
  sendCollectOrb: (orbId: string) => void;
}

export const globalGameState: { current: GameState | null } = { current: null };
let lastUiUpdate = 0;
let isConnected = false;

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  playerId: null,
  connect: () => {
    if (isConnected) return;
    isConnected = true;

    standaloneEngine.start();
    const pid = standaloneEngine.getLocalPlayerId();
    set({ playerId: pid });

    standaloneEngine.subscribe((state: GameState) => {
      globalGameState.current = state;
      const now = Date.now();
      if (now - lastUiUpdate > 80) { // ~12Hz UI update throttle for low CPU overhead
        set({ gameState: { ...state } });
        lastUiUpdate = now;
      }
    });
  },
  joinGame: (options) => {
    standaloneEngine.joinPlayer(options);
  },
  sendPlayerState: (data) => {
    standaloneEngine.updateLocalPlayerState(data);
  },
  sendCollectOrb: (orbId) => {
    standaloneEngine.collectOrb(orbId);
  },
}));
