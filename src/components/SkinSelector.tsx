/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { SKINS, Skin, getUnlockedSkinIds, unlockSkin, setSelectedSkinId, getSelectedSkinId } from '../shared/skins';
import { crazyGamesRequestRewardedAd } from '../lib/crazygames';
import { Sparkles, Lock, Check, Play, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { soundManager } from '../lib/soundManager';

interface SkinSelectorProps {
  onClose: () => void;
  onSkinSelected: (skinId: string) => void;
}

export function SkinSelector({ onClose, onSkinSelected }: SkinSelectorProps) {
  const [unlockedIds, setUnlockedIds] = useState<string[]>(getUnlockedSkinIds());
  const [selectedId, setSelectedId] = useState<string>(getSelectedSkinId());
  const [adError, setAdError] = useState<string | null>(null);
  const [isLoadingAd, setIsLoadingAd] = useState<boolean>(false);
  const [fallbackSkin, setFallbackSkin] = useState<Skin | null>(null);

  const handleSelectSkin = (skin: Skin) => {
    soundManager.playClickSound();
    if (!unlockedIds.includes(skin.id)) {
      setAdError(`Watch a short rewarded ad to unlock ${skin.name}!`);
      setFallbackSkin(null);
      return;
    }
    setSelectedId(skin.id);
    setSelectedSkinId(skin.id);
    onSkinSelected(skin.id);
  };

  const handleUnlockWithAd = (skin: Skin, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoadingAd(true);
    setAdError(null);
    setFallbackSkin(null);

    crazyGamesRequestRewardedAd(
      () => {
        setIsLoadingAd(false);
        unlockSkin(skin.id);
        setUnlockedIds(getUnlockedSkinIds());
        setSelectedId(skin.id);
        setSelectedSkinId(skin.id);
        onSkinSelected(skin.id);
      },
      (err, canFallback) => {
        setIsLoadingAd(false);
        setAdError(err || 'Could not watch ad on this domain.');
        if (canFallback) {
          setFallbackSkin(skin);
        }
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg pointer-events-auto"
    >
      <div className="relative w-full max-w-2xl bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide uppercase">Worm Skins Locker</h2>
              <p className="text-xs text-cyan-300/70 font-mono">CrazyGames Customization Studio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {adError && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{adError}</span>
            </div>
            {fallbackSkin && (
              <button
                onClick={() => {
                  unlockSkin(fallbackSkin.id);
                  setUnlockedIds(getUnlockedSkinIds());
                  setSelectedId(fallbackSkin.id);
                  setSelectedSkinId(fallbackSkin.id);
                  onSkinSelected(fallbackSkin.id);
                  setAdError(null);
                  setFallbackSkin(null);
                }}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-lg text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex-shrink-0"
              >
                Unlock {fallbackSkin.name} Anyway
              </button>
            )}
          </div>
        )}

        {/* Skins Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1 pb-2">
          {SKINS.map((skin) => {
            const isUnlocked = unlockedIds.includes(skin.id);
            const isSelected = selectedId === skin.id;

            return (
              <div
                key={skin.id}
                onClick={() => handleSelectSkin(skin)}
                className={`relative rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between overflow-hidden ${
                  isSelected
                    ? 'bg-slate-800/90 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] scale-[1.02]'
                    : isUnlocked
                    ? 'bg-slate-900/60 border-slate-700/60 hover:border-slate-500 hover:bg-slate-800/50'
                    : 'bg-slate-950/60 border-slate-800 opacity-85'
                }`}
              >
                {/* Visual Gradient Bar */}
                <div className={`h-3 w-full rounded-full bg-gradient-to-r ${skin.gradient} mb-3 shadow-sm`} />

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{skin.name}</h3>
                      {skin.isPremium && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                          CrazyGames Premium
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">{skin.description}</p>
                  </div>

                  {/* Status Indicator / Action */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    {isSelected ? (
                      <div className="w-8 h-8 rounded-full bg-cyan-500 text-black flex items-center justify-center font-bold shadow-md">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    ) : isUnlocked ? (
                      <span className="text-xs font-bold text-cyan-400 hover:underline px-2 py-1 rounded bg-cyan-950/40 border border-cyan-500/30">Select</span>
                    ) : (
                      <button
                        onClick={(e) => handleUnlockWithAd(skin, e)}
                        disabled={isLoadingAd}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Watch Ad to Unlock</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <p className="font-mono">Selected: <span className="text-cyan-300 font-bold">{SKINS.find(s => s.id === selectedId)?.name}</span></p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black tracking-wide uppercase transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)]"
          >
            Ready to Play
          </button>
        </div>
      </div>
    </motion.div>
  );
}
