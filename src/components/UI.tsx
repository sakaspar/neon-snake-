/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Trophy, Sparkles, Play, ShieldAlert, Zap, RotateCw, Maximize, Minimize, Volume2, VolumeX } from 'lucide-react';
import { MobileControls } from './MobileControls';
import { SkinSelector } from './SkinSelector';
import { SKINS, getSelectedSkinId, getSkinById } from '../shared/skins';
import { requestFullscreen, toggleFullscreen, isFullscreen } from '../lib/fullscreen';
import { soundManager } from '../lib/soundManager';
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
  const [showMobileLeaderboard, setShowMobileLeaderboard] = useState<boolean>(false);
  const [bonusScore, setBonusScore] = useState<number>(0);
  const [hasClaimedBonus, setHasClaimedBonus] = useState<boolean>(false);
  const [isAdLoading, setIsAdLoading] = useState<boolean>(false);
  const [adMessage, setAdMessage] = useState<string | null>(null);
  const [adFallbackAction, setAdFallbackAction] = useState<(() => void) | null>(null);

  // Landscape / Portrait orientation handling
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [dismissRotatePrompt, setDismissRotatePrompt] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 768;
      setIsPortrait(portrait);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const player = playerId && gameState ? gameState.players[playerId] : null;
  const isAlive = player?.state === 'alive';
  const isDead = player?.state === 'dead';

  // Calculate my leaderboard rank
  const myRank = gameState && playerId
    ? gameState.leaderboard.findIndex((e) => e.id === playerId) + 1
    : 0;

  // Trigger gameplayStop when player dies
  useEffect(() => {
    if (isDead) {
      crazyGamesGameplayStop();
    }
  }, [isDead]);

  const [isFs, setIsFs] = useState<boolean>(false);

  useEffect(() => {
    const handleFsChange = () => setIsFs(isFullscreen());
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(soundManager.isMuted());

  const handleToggleAudio = () => {
    const muted = soundManager.toggleUserMute();
    setIsAudioMuted(muted);
  };

  const handleJoinGame = () => {
    try {
      requestFullscreen();
      if (screen.orientation && 'lock' in screen.orientation) {
        (screen.orientation as any).lock('landscape').catch(() => {});
      }
    } catch {}
    crazyGamesGameplayStart();
    soundManager.playSpawnSound();
    joinGame({ skinId: selectedSkinId, bonusScore });
    setBonusScore(0);
    setHasClaimedBonus(false);
  };

  const handleReviveWithAd = () => {
    setIsAdLoading(true);
    setAdMessage(null);
    setAdFallbackAction(null);

    const grantRevive = () => {
      crazyGamesTriggerHappytime();
      crazyGamesGameplayStart();
      joinGame({ skinId: selectedSkinId, bonusScore: 25 });
    };

    crazyGamesRequestRewardedAd(
      () => {
        setIsAdLoading(false);
        grantRevive();
      },
      (err) => {
        setIsAdLoading(false);
        setAdMessage(err || 'Ad unavailable on this domain.');
        setAdFallbackAction(() => grantRevive);
      }
    );
  };

  const handleClaimBonusAd = () => {
    setIsAdLoading(true);
    setAdMessage(null);
    setAdFallbackAction(null);

    const grantBonus = () => {
      setBonusScore(50);
      setHasClaimedBonus(true);
    };

    crazyGamesRequestRewardedAd(
      () => {
        setIsAdLoading(false);
        grantBonus();
      },
      (err) => {
        setIsAdLoading(false);
        setAdMessage(err || 'Ad unavailable on this domain.');
        setAdFallbackAction(() => grantBonus);
      }
    );
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const activeSkin = getSkinById(selectedSkinId);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4 select-none overflow-hidden">
      {/* Mobile Controls Layer when alive */}
      {isAlive && <MobileControls />}

      {/* Landscape Orientation Recommendation Banner on Mobile */}
      {isPortrait && !dismissRotatePrompt && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(6,182,212,0.6)] animate-bounce">
            <RotateCw className="w-10 h-10 text-slate-950 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight uppercase">
            Rotate to Landscape 📱🔄
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xs mb-6 font-medium leading-relaxed">
            For maximum widescreen view and unobstructed gameplay, please turn your device to <span className="text-cyan-400 font-bold">Landscape Mode</span>!
          </p>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <button
              onClick={() => {
                try {
                  if (screen.orientation && 'lock' in screen.orientation) {
                    (screen.orientation as any).lock('landscape').catch(() => {});
                  }
                } catch {}
                setDismissRotatePrompt(true);
              }}
              className="w-full py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black rounded-xl text-xs sm:text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-transform"
            >
              Play Landscape
            </button>
            <button
              onClick={() => setDismissRotatePrompt(true)}
              className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Continue in Portrait
            </button>
          </div>
        </div>
      )}

      {/* Top Bar / HUD */}
      <div className="flex justify-between items-center pointer-events-auto w-full z-20">
        {/* Left: Compact Score / Skin Info during gameplay */}
        {isAlive ? (
          <div className="flex items-center gap-2">
            {/* Compact Glass Score Badge */}
            <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-cyan-500/40 text-white shadow-lg">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: activeSkin.headColor }} />
              <span className="text-xs sm:text-sm font-mono font-black text-cyan-300">Length: {Math.floor(player.score)}</span>
            </div>

            {/* Game Title - Hidden on small screens to keep canvas clear */}
            <h1 className="hidden md:block text-lg font-black text-white/90 tracking-tight ml-2">
              NEON.SNAKE
            </h1>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tighter" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
              NEON.SNAKE
            </h1>
            <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase hidden sm:inline-block">
              CrazyGames Edition
            </span>
          </div>
        )}

        {/* Right: Leaderboard Toggle & Controls */}
        <div className="flex items-center gap-2">
          {/* Leaderboard Toggle Button for Mobile / Small screens */}
          {isAlive && gameState && (
            <button
              onClick={() => setShowMobileLeaderboard(!showMobileLeaderboard)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/80 hover:bg-slate-900 backdrop-blur-md rounded-full text-yellow-400 text-xs font-bold border border-yellow-500/40 transition-all shadow-md md:hidden"
            >
              <Trophy size={14} className="text-yellow-400" />
              <span>#{myRank > 0 ? myRank : '1'}</span>
            </button>
          )}

          {/* PC Keyboard Controls hint */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-white bg-white/5 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
            <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded text-white">A</span>
            <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded text-white">D</span>
            <span className="text-white/70 uppercase tracking-wider text-[10px]">Turn</span>
            <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded text-white ml-2">SPACE</span>
            <span className="text-white/70 uppercase tracking-wider text-[10px]">Boost</span>
          </div>

          {/* Sound Toggle Button */}
          <button
            onClick={handleToggleAudio}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 border backdrop-blur-md rounded-full text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 ${
              isAudioMuted
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}
            title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isAudioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <span className="hidden sm:inline">{isAudioMuted ? 'Muted' : 'Sound'}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={() => toggleFullscreen()}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 backdrop-blur-md rounded-full text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95"
            title="Toggle Fullscreen"
          >
            {isFs ? <Minimize size={14} /> : <Maximize size={14} />}
            <span className="hidden sm:inline">{isFs ? 'Exit Full' : 'Fullscreen'}</span>
          </button>

          <button
            onClick={handleOpenNewTab}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white text-xs sm:text-sm font-bold transition-colors"
          >
            <ExternalLink size={14} />
            <span className="hidden sm:inline">New Tab</span>
          </button>
        </div>
      </div>

      {/* Desktop Leaderboard Box (Hidden on Mobile) */}
      {isAlive && gameState && gameState.leaderboard.length > 0 && (
        <div className="hidden md:block absolute top-16 right-4 w-56 bg-slate-950/70 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 pointer-events-auto z-10 shadow-xl">
          <div className="flex items-center gap-2 mb-2 text-white/80 font-semibold text-xs tracking-wider">
            <Trophy size={14} className="text-yellow-400" />
            <h2>LEADERBOARD</h2>
          </div>
          <div className="flex flex-col gap-1.5">
            {gameState.leaderboard.slice(0, 8).map((entry, i) => {
              const entrySkin = getSkinById(entry.skinId || 'cyberpunk');
              const isMe = entry.id === playerId;
              return (
                <div key={entry.id} className={`flex justify-between items-center text-xs ${isMe ? 'bg-cyan-950/80 font-bold px-1.5 py-0.5 rounded border border-cyan-500/40 text-cyan-300' : ''}`}>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-white/40 w-3.5">{i + 1}.</span>
                    <span style={{ color: entrySkin.headColor }} className="truncate max-w-[95px]">
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

      {/* Mobile Leaderboard Popup Drawer */}
      <AnimatePresence>
        {isAlive && showMobileLeaderboard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="absolute top-14 right-3 w-56 bg-slate-950/95 backdrop-blur-xl rounded-2xl p-3.5 border border-yellow-500/40 pointer-events-auto z-40 shadow-2xl md:hidden"
          >
            <div className="flex justify-between items-center mb-2.5 text-white/90 font-bold text-xs">
              <div className="flex items-center gap-1.5 text-yellow-400">
                <Trophy size={14} />
                <span>LEADERBOARD</span>
              </div>
              <button
                onClick={() => setShowMobileLeaderboard(false)}
                className="text-white/60 hover:text-white px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
              {gameState?.leaderboard.map((entry, i) => {
                const entrySkin = getSkinById(entry.skinId || 'cyberpunk');
                const isMe = entry.id === playerId;
                return (
                  <div key={entry.id} className={`flex justify-between items-center text-xs p-1 rounded ${isMe ? 'bg-cyan-950 border border-cyan-500/50 font-bold text-cyan-300' : ''}`}>
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-white/40 w-3.5 font-mono">{i + 1}.</span>
                      <span style={{ color: entrySkin.headColor }} className="truncate max-w-[100px]">
                        {entry.name}
                      </span>
                    </div>
                    <span className="font-mono text-white/90">{entry.score}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menus (Join Arena / You Died) */}
      <AnimatePresence>
        {(!player || isDead) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/75 backdrop-blur-md p-4"
          >
            <div className="bg-zinc-900/90 p-5 sm:p-8 rounded-3xl border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.2)] max-w-md w-full flex flex-col items-center gap-4 max-h-[92vh] overflow-y-auto">
              {isDead ? (
                <div className="text-center">
                  <h2 className="text-3xl sm:text-4xl font-black text-rose-500 mb-1 tracking-tight">YOU DIED</h2>
                  <p className="text-white/70 font-mono text-xs sm:text-sm">Final Length: <span className="text-amber-400 font-bold">{Math.floor(player.score)}</span></p>
                </div>
              ) : (
                <div className="text-center">
                  <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">JOIN ARENA</h2>
                  <p className="text-white/60 text-[11px] sm:text-xs font-medium">
                    Drag <span className="text-cyan-400 font-bold">Joystick</span> to steer • Tap <span className="text-amber-400 font-bold">Boost</span> & <span className="text-cyan-400 font-bold">Brake</span>
                  </p>
                </div>
              )}

              {/* Selected Skin Card */}
              <div
                onClick={() => setShowSkinModal(true)}
                className="w-full p-3 sm:p-3.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 hover:border-cyan-400 cursor-pointer flex items-center justify-between transition-all group shadow-inner"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r ${activeSkin.gradient} shadow-lg`} />
                  <div>
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-wider font-mono text-slate-400">Equipped Skin</div>
                    <div className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">{activeSkin.name}</div>
                  </div>
                </div>
                <button className="flex items-center gap-1.5 text-xs font-extrabold text-cyan-400 bg-cyan-950/60 border border-cyan-500/40 px-2.5 py-1.5 sm:px-3 rounded-xl group-hover:bg-cyan-500 group-hover:text-black transition-all">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Skins Gallery</span>
                </button>
              </div>

              {adMessage && (
                <div className="flex flex-col gap-2 w-full">
                  <div className="text-xs text-amber-300 bg-amber-950/60 border border-amber-500/40 p-2.5 rounded-xl flex items-center gap-2 w-full">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-400" />
                    <span className="leading-snug">{adMessage}</span>
                  </div>
                  {adFallbackAction && (
                    <button
                      onClick={() => {
                        if (adFallbackAction) adFallbackAction();
                        setAdMessage(null);
                        setAdFallbackAction(null);
                      }}
                      className="w-full py-2.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-black" />
                      <span>CLAIM REWARD ANYWAY (DEV/VERCEL MODE)</span>
                    </button>
                  )}
                </div>
              )}

              {/* Bonus / Instant Revive Buttons */}
              {isDead ? (
                <div className="w-full flex flex-col gap-2">
                  <button
                    onClick={handleReviveWithAd}
                    disabled={isAdLoading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 disabled:opacity-50 text-xs sm:text-sm"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>WATCH AD TO REVIVE +25 LENGTH</span>
                  </button>
                  <button
                    onClick={handleJoinGame}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors text-xs sm:text-sm"
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
                    className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black rounded-xl hover:brightness-110 transition-all text-sm sm:text-base tracking-wider uppercase shadow-[0_0_25px_rgba(34,211,238,0.5)] active:scale-95"
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


