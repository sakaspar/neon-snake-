/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { crazyGamesGetData, crazyGamesSaveData } from '../lib/crazygames';

export interface Skin {
  id: string;
  name: string;
  category: 'Cyber' | 'Elemental' | 'Cosmic' | 'Royalty';
  headColor: string;
  bodyColor: string;
  glowColor: string;
  accentColor?: string;
  isPremium: boolean;
  description: string;
  gradient: string; // TailWind CSS preview gradient string
}

export const SKINS: Skin[] = [
  {
    id: 'cyberpunk',
    name: 'Cyber Neon',
    category: 'Cyber',
    headColor: '#00f0ff',
    bodyColor: '#ff007f',
    glowColor: '#00f0ff',
    accentColor: '#ffffff',
    isPremium: false,
    description: 'Free default starter skin for all players',
    gradient: 'from-cyan-400 via-fuchsia-500 to-pink-500',
  },
  {
    id: 'toxic',
    name: 'Toxic Venom',
    category: 'Elemental',
    headColor: '#22c55e',
    bodyColor: '#10b981',
    glowColor: '#4ade80',
    accentColor: '#a3e635',
    isPremium: true,
    description: 'Radioactive neon green venom serpent',
    gradient: 'from-lime-400 via-emerald-500 to-green-600',
  },
  {
    id: 'solar',
    name: 'Solar Flare',
    category: 'Elemental',
    headColor: '#f59e0b',
    bodyColor: '#ef4444',
    glowColor: '#fbbf24',
    accentColor: '#fef08a',
    isPremium: true,
    description: 'Blazing solar plasma energy trail',
    gradient: 'from-amber-400 via-orange-500 to-red-600',
  },
  {
    id: 'violet',
    name: 'Plasma Violet',
    category: 'Cyber',
    headColor: '#a855f7',
    bodyColor: '#ec4899',
    glowColor: '#c084fc',
    accentColor: '#f472b6',
    isPremium: true,
    description: 'Deep violet dark matter pulse',
    gradient: 'from-purple-500 via-fuchsia-500 to-pink-500',
  },
  {
    id: 'obsidian',
    name: 'Shadow Obsidian',
    category: 'Cyber',
    headColor: '#38bdf8',
    bodyColor: '#1e293b',
    glowColor: '#0284c7',
    accentColor: '#60a5fa',
    isPremium: true,
    description: 'Dark obsidian stealth armor with electric blue optics',
    gradient: 'from-slate-900 via-cyan-900 to-sky-500',
  },
  {
    id: 'rainbow',
    name: 'Prism Rainbow',
    category: 'Cosmic',
    headColor: '#f43f5e',
    bodyColor: '#8b5cf6',
    glowColor: '#06b6d4',
    accentColor: '#eab308',
    isPremium: true,
    description: 'Hypercolor spectrum rainbow shifting trail',
    gradient: 'from-red-500 via-yellow-400 via-green-400 via-blue-500 to-purple-500',
  },
  {
    id: 'golden',
    name: 'Golden Royale',
    category: 'Royalty',
    headColor: '#fbbf24',
    bodyColor: '#fef08a',
    glowColor: '#f59e0b',
    accentColor: '#ffffff',
    isPremium: true,
    description: 'Pure 24K polished gold body with diamond core glow',
    gradient: 'from-yellow-300 via-amber-400 to-yellow-600',
  },
  {
    id: 'galaxy',
    name: 'Galaxy Starlight',
    category: 'Cosmic',
    headColor: '#818cf8',
    bodyColor: '#4c1d95',
    glowColor: '#c084fc',
    accentColor: '#e0e7ff',
    isPremium: true,
    description: 'Nebula cosmic dust with twinkling starlight core',
    gradient: 'from-indigo-900 via-purple-600 to-pink-400',
  },
];

const UNLOCKED_SKINS_KEY = 'neon_snake_unlocked_skins';
const SELECTED_SKIN_KEY = 'neon_snake_selected_skin';

export function getSkinById(id: string): Skin {
  return SKINS.find((s) => s.id === id) || SKINS[0];
}

export function getUnlockedSkinIds(): string[] {
  const saved = crazyGamesGetData(UNLOCKED_SKINS_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  // By default, only 'cyberpunk' is free
  return ['cyberpunk'];
}

export function unlockSkin(skinId: string) {
  const current = getUnlockedSkinIds();
  if (!current.includes(skinId)) {
    const updated = [...current, skinId];
    crazyGamesSaveData(UNLOCKED_SKINS_KEY, JSON.stringify(updated));
  }
}

export function getSelectedSkinId(): string {
  const saved = crazyGamesGetData(SELECTED_SKIN_KEY);
  if (saved && SKINS.some((s) => s.id === saved)) {
    return saved;
  }
  return 'cyberpunk';
}

export function setSelectedSkinId(skinId: string) {
  crazyGamesSaveData(SELECTED_SKIN_KEY, skinId);
}
