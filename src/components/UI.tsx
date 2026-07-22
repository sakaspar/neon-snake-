/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Trophy, Sparkles, Play, ShieldAlert, Zap } from 'lucide-react';
import { MobileControls } from './MobileControls';
import { SkinSelector } from './SkinSelector';
import { SKINS, getSelectedSkinId, getSkinById } from '../shared/skins';
import {
  crazyGamesGameplayStart,
  crazyGamesGameplayStop,
  crazyGamesRequestMidrollAd,
  crazyGamesRequestRewardedAd,
  crazyGamesTriggerHappytime
} from '../lib/crazygames';

export function UI() {
  const { gameState, playerId, joinGame } = useGameStore();
  const [selectedSkinId, setSelectedSkinId] = useState<string>(getSelectedSkinId());
  const [showSkinModal, setShowSkinModal] = useState<boolean>(false);
  const [bonusScore, setBonusScore] = useState<number>(0);
  const [hasClaimedBonus, setHasClaimedBonus] = useState<boolean>(false);
  const [isAdLoading, setIsAdLoading] = useState<boolean>(false);
  const [adMessage, setAdMessage] = useState<string | null>(null);

  const player = playerId && gameState ? gameState.players[playerId] : null;
  const isAlive = player?.state === 'alive';
  const isDead = player?.state === 'dead';

  // Trigger gameplayStop when player dies
  useEffect(() => {
    if (isDead) {
      crazyGamesGameplayStop();
    }
  }, [isDead]);

  const handleJoinGame = () => {
    crazyGamesGameplayStart();
    joinGame({ skinId: selectedSkinId, bonusScore });
    setBonusScore(0);
    setHasClaimedBonus(false);
  };

  const handleReviveWithAd = () => {
    setIsAdLoading(true);
    setAdMessage(null);

    crazyGamesRequestRewardedAd(
      () => {
        setIsAdLoading(false);
        crazyGamesTriggerHappytime();
        crazyGamesGameplayStart();
        joinGame({ skinId: selectedSkinId, bonusScore: 25 });
      },
      (err) => {
        setIsAdLoading(false);
        setAdMessage(err || 'Failed to play ad. Try normal respawn!');
      }
    );
  };

  const handleClaimBonusAd = () => {
    setIsAdLoading(true);
    setAdMessage(null);

    crazyGamesRequestRewardedAd(
      () => {
        setIsAdLoading(false);
        setBonusScore(50);
        setHasClaimedBonus(true);
      },
      (err) => {
        setIsAdLoading(false);
        setAdMessage(err || 'Could not load ad.');
      }
    );
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const activeSkin = getSkinById(selectedSkinId);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
      {/* Mobile Controls Layer when alive */}
      {isAlive && <MobileControls />}

      {/* Top Bar */}
      <div className="flex justify-between items-start pointer-events-auto relative">
        <div className="flex flex-col gap-2 z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-white tracking-tighter" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
              NEON.SNAKE
            </h1>
            <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase hidden sm:inline-block">
              CrazyGames Edition
            </span>
          </div>
          {isAlive && (
            <div className="text-xl font-mono text-white/80 font-bold flex items-center gap-2">
              <span>Length: {Math.floor(player.score)}</span>
              <span className={`text-xs px-2 py-0.5 rounded bg-gradient-to-r ${activeSkin.gradient} text-white font-bold`}>
                {activeSkin.name}
              </span>
            </div>
          )}
        </div>
        
        {/* Controls Hint */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 flex gap-2 opacity-80 pointer-events-none hidden sm:flex">
          <div className="flex items-center gap-2 text-xs font-mono text-white bg-white/5 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
            <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded text-white">A</span>
            <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded text-white">D</span>
            <span className="text-white/70 uppercase tracking-wider text-[10px]">Turn</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-white bg-white/5 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
            <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded text-white">SPACE</span>
            <span className="text-white/70 uppercase tracking-wider text-[10px]">Boost</span>
          </div>
        </div>

        <button
          onClick={handleOpenNewTab}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white text-sm font-bold transition-colors z-10"
        >
          <ExternalLink size={16} />
          <span>New Tab</span>
        </button>
      </div>

      {/* Leaderboard */}
      {gameState && gameState.leaderboard.length > 0 && (
        <div className="absolute top-20 right-4 w-64 bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/10 pointer-events-auto">
          <div className="flex items-center gap-2 mb-4 text-white/80 font-semibold">
            <Trophy size={18} className="text-yellow-400" />
            <h2>LEADERBOARD</h2>
          </div>
          <div className="flex flex-col gap-2">
            {gameState.leaderboard.map((entry, i) => {
              const entrySkin = getSkinById(entry.skinId || 'cyberpunk');
              return (
                <div key={entry.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-white/40 w-4">{i + 1}.</span>
                    <span style={{ color: entrySkin.headColor }} className="font-medium truncate max-w-[120px]">
                      {entry.name}
                    </span>
                  </div>
                  <span className="font-mono text-white/80">{entry.score}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Menus */}
      <AnimatePresence>
        {(!player || isDead) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/70 backdrop-blur-md"
          >
            <div className="bg-zinc-900/90 p-8 rounded-3xl border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.2)] max-w-md w-full flex flex-col items-center gap-5">
              {isDead ? (
                <div className="text-center">
                  <h2 className="text-4xl font-black text-rose-500 mb-1 tracking-tight">YOU DIED</h2>
                  <p className="text-white/70 font-mono text-sm">Final Length: <span className="text-amber-400 font-bold">{Math.floor(player.score)}</span></p>
                </div>
              ) : (
                <div className="text-center">
                  <h2 className="text-3xl font-black text-white mb-1">JOIN ARENA</h2>
                  <p className="text-white/60 text-xs font-medium">
                    Drag <span className="text-cyan-400 font-bold">Joystick</span> to steer • Tap <span className="text-amber-400 font-bold">Boost</span> & <span className="text-cyan-400 font-bold">Brake</span>
                  </p>
                </div>
              )}

              {/* Selected Skin Card */}
              <div
                onClick={() => setShowSkinModal(true)}
                className="w-full p-3.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 hover:border-cyan-400 cursor-pointer flex items-center justify-between transition-all group shadow-inner"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${activeSkin.gradient} shadow-lg`} />
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-mono text-slate-400">Equipped Skin</div>
                    <div className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">{activeSkin.name}</div>
                  </div>
                </div>
                <button className="flex items-center gap-1.5 text-xs font-extrabold text-cyan-400 bg-cyan-950/60 border border-cyan-500/40 px-3 py-1.5 rounded-xl group-hover:bg-cyan-500 group-hover:text-black transition-all">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Skins Gallery</span>
                </button>
              </div>

              {adMessage && (
                <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-500/40 p-2.5 rounded-xl flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{adMessage}</span>
                </div>
              )}

              {/* Bonus / Instant Revive Buttons */}
              {isDead ? (
                <div className="w-full flex flex-col gap-2">
                  <button
                    onClick={handleReviveWithAd}
                    disabled={isAdLoading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>WATCH AD TO REVIVE +25 LENGTH</span>
                  </button>
                  <button
                    onClick={handleJoinGame}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors text-sm"
                  >
                    NORMAL RESPAWN
                  </button>
                </div>
              ) : (
                <div className="w-full flex flex-col gap-2">
                  {!hasClaimedBonus ? (
                    <button
                      onClick={handleClaimBonusAd}
                      disabled={isAdLoading}
                      className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-900/80 to-purple-900/80 border border-purple-500/40 text-purple-200 font-bold rounded-xl hover:border-purple-400 transition-all flex items-center justify-center gap-2 text-xs"
                    >
                      <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
                      <span>CrazyGames Ad: +50 Starting Length Boost</span>
                    </button>
                  ) : (
                    <div className="w-full py-2 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl text-xs text-center">
                      ⚡ +50 Length Boost Activated!
                    </div>
                  )}

                  <button
                    onClick={handleJoinGame}
                    className="w-full py-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black rounded-xl hover:brightness-110 transition-all text-base tracking-wider uppercase shadow-[0_0_25px_rgba(34,211,238,0.5)] active:scale-95"
                  >
                    PLAY NOW
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skin Selector Modal */}
      <AnimatePresence>
        {showSkinModal && (
          <SkinSelector
            onClose={() => setShowSkinModal(false)}
            onSkinSelected={(skinId) => setSelectedSkinId(skinId)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

