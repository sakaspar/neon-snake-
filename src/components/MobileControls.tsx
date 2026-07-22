/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { mobileInputState } from '../store/inputStore';
import { Zap, Shield, Navigation, ArrowLeft, ArrowRight } from 'lucide-react';

interface JoystickPos {
  active: boolean;
  baseX: number;
  baseY: number;
  knobX: number;
  knobY: number;
  angleDeg: number;
}

export function MobileControls() {
  const [joystick, setJoystick] = useState<JoystickPos>({
    active: false,
    baseX: 0,
    baseY: 0,
    knobX: 0,
    knobY: 0,
    angleDeg: 0,
  });

  const [isBoostActive, setIsBoostActive] = useState(false);
  const [isBrakeActive, setIsBrakeActive] = useState(false);
  const [isLeftActive, setIsLeftActive] = useState(false);
  const [isRightActive, setIsRightActive] = useState(false);

  const leftZoneRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);

  const maxRadius = 45; // max joystick knob distance

  // Touch handlers for virtual joystick
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (touchIdRef.current !== null) return;

    const touch = e.changedTouches[0];
    if (!touch || !leftZoneRef.current) return;

    touchIdRef.current = touch.identifier;
    const rect = leftZoneRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    setJoystick({
      active: true,
      baseX: x,
      baseY: y,
      knobX: 0,
      knobY: 0,
      angleDeg: 0,
    });

    mobileInputState.joystickActive = false;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (touchIdRef.current === null || !leftZoneRef.current) return;

    let touch: React.Touch | null = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touch = e.changedTouches[i];
        break;
      }
    }
    if (!touch) return;

    const rect = leftZoneRef.current.getBoundingClientRect();
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;

    setJoystick((prev) => {
      if (!prev.active) return prev;

      const dx = currentX - prev.baseX;
      const dy = currentY - prev.baseY;
      const dist = Math.hypot(dx, dy);

      if (dist < 5) {
        mobileInputState.joystickActive = false;
        return { ...prev, knobX: 0, knobY: 0 };
      }

      const clampedDist = Math.min(dist, maxRadius);
      const angleRadDOM = Math.atan2(dy, dx);

      const knobX = Math.cos(angleRadDOM) * clampedDist;
      const knobY = Math.sin(angleRadDOM) * clampedDist;

      // Convert DOM coordinate angle (y goes down) to 3D game angle (y goes up)
      const gameAngleRad = Math.atan2(-dy, dx);

      mobileInputState.joystickActive = true;
      mobileInputState.joystickAngle = gameAngleRad;

      const angleDeg = (gameAngleRad * 180) / Math.PI;

      return {
        ...prev,
        knobX,
        knobY,
        angleDeg,
      };
    });
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setJoystick((prev) => ({ ...prev, active: false, knobX: 0, knobY: 0 }));
        mobileInputState.joystickActive = false;
        break;
      }
    }
  };

  // Direct Button Steer Handlers
  const handleLeftDown = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsLeftActive(true);
    mobileInputState.left = true;
  };
  const handleLeftUp = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsLeftActive(false);
    mobileInputState.left = false;
  };

  const handleRightDown = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsRightActive(true);
    mobileInputState.right = true;
  };
  const handleRightUp = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsRightActive(false);
    mobileInputState.right = false;
  };

  // Boost button handlers
  const handleBoostDown = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsBoostActive(true);
    mobileInputState.boost = true;
    if ('vibrate' in navigator) navigator.vibrate(20);
  };

  const handleBoostUp = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsBoostActive(false);
    mobileInputState.boost = false;
  };

  // Brake button handlers
  const handleBrakeDown = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsBrakeActive(true);
    mobileInputState.brake = true;
    if ('vibrate' in navigator) navigator.vibrate(15);
  };

  const handleBrakeUp = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsBrakeActive(false);
    mobileInputState.brake = false;
  };

  // Reset inputs on unmount
  useEffect(() => {
    return () => {
      mobileInputState.joystickActive = false;
      mobileInputState.left = false;
      mobileInputState.right = false;
      mobileInputState.boost = false;
      mobileInputState.brake = false;
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none select-none touch-none z-30 overflow-hidden">
      {/* Left Touch Joystick Zone */}
      <div
        ref={leftZoneRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="absolute left-0 top-0 bottom-0 w-1/2 pointer-events-auto touch-none"
      >
        {/* Dynamic / Static Joystick Render */}
        {joystick.active ? (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${joystick.baseX}px`, top: `${joystick.baseY}px` }}
          >
            {/* Base Ring */}
            <div className="w-24 h-24 rounded-full border-2 border-cyan-400/60 bg-cyan-950/50 backdrop-blur-md shadow-[0_0_25px_rgba(34,211,238,0.4)] flex items-center justify-center relative">
              <div
                className="absolute w-full h-full flex items-center justify-center transition-transform duration-75"
                style={{ transform: `rotate(${-joystick.angleDeg}deg)` }}
              >
                <Navigation className="text-cyan-400 w-4 h-4 absolute right-1 rotate-90" />
              </div>

              {/* Moveable Knob */}
              <div
                className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 border border-white shadow-[0_0_15px_rgba(34,211,238,0.9)] flex items-center justify-center"
                style={{
                  transform: `translate(${joystick.knobX}px, ${joystick.knobY}px)`,
                }}
              >
                <div className="w-3 h-3 rounded-full bg-white shadow-inner" />
              </div>
            </div>
          </div>
        ) : (
          /* Default resting indicator */
          <div className="absolute left-4 bottom-14 pointer-events-none opacity-40">
            <div className="w-20 h-20 rounded-full border border-dashed border-cyan-400/40 bg-cyan-950/20 flex items-center justify-center relative animate-pulse">
              <Navigation className="text-cyan-300 w-4 h-4" />
            </div>
            <span className="block mt-1 text-[9px] font-mono font-bold text-cyan-300/80 uppercase tracking-wider text-center">
              DRAG TO STEER
            </span>
          </div>
        )}
      </div>

      {/* On-Screen Arrow Steering Buttons (Left Bottom Corner override) */}
      <div className="absolute left-3 bottom-3 flex items-center gap-2 pointer-events-auto touch-none">
        <button
          onTouchStart={handleLeftDown}
          onTouchEnd={handleLeftUp}
          onMouseDown={handleLeftDown}
          onMouseUp={handleLeftUp}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all active:scale-90 ${
            isLeftActive
              ? 'bg-cyan-500 border-white text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.8)] scale-95'
              : 'bg-slate-950/70 border-cyan-500/40 text-cyan-300 backdrop-blur-md'
          }`}
        >
          <ArrowLeft className="w-6 h-6 stroke-[3]" />
        </button>
        <button
          onTouchStart={handleRightDown}
          onTouchEnd={handleRightUp}
          onMouseDown={handleRightDown}
          onMouseUp={handleRightUp}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all active:scale-90 ${
            isRightActive
              ? 'bg-cyan-500 border-white text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.8)] scale-95'
              : 'bg-slate-950/70 border-cyan-500/40 text-cyan-300 backdrop-blur-md'
          }`}
        >
          <ArrowRight className="w-6 h-6 stroke-[3]" />
        </button>
      </div>

      {/* Right Action Buttons Area */}
      <div className="absolute right-3 bottom-3 sm:right-6 sm:bottom-6 flex items-end gap-2.5 sm:gap-4 pointer-events-auto touch-none">
        {/* BRAKE BUTTON */}
        <button
          onTouchStart={handleBrakeDown}
          onTouchEnd={handleBrakeUp}
          onMouseDown={handleBrakeDown}
          onMouseUp={handleBrakeUp}
          className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center border-2 transition-all duration-100 active:scale-90 ${
            isBrakeActive
              ? 'bg-blue-600 border-cyan-300 shadow-[0_0_25px_rgba(59,130,246,0.9)] scale-95'
              : 'bg-slate-950/80 border-cyan-500/50 text-cyan-300 backdrop-blur-md'
          }`}
        >
          <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[8px] sm:text-[9px] font-black text-cyan-200 uppercase mt-0.5">
            BRAKE
          </span>
        </button>

        {/* BOOST BUTTON */}
        <button
          onTouchStart={handleBoostDown}
          onTouchEnd={handleBoostUp}
          onMouseDown={handleBoostDown}
          onMouseUp={handleBoostUp}
          className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center border-2 transition-all duration-100 active:scale-90 ${
            isBoostActive
              ? 'bg-gradient-to-tr from-amber-500 to-rose-500 border-yellow-200 shadow-[0_0_35px_rgba(245,158,11,1)] scale-95'
              : 'bg-gradient-to-tr from-amber-600/80 to-orange-950/80 border-amber-400/60 backdrop-blur-md'
          }`}
        >
          <Zap className={`w-6 h-6 sm:w-8 sm:h-8 ${isBoostActive ? 'text-yellow-100 animate-bounce' : 'text-amber-300'}`} />
          <span className="text-[8px] sm:text-[10px] font-black text-amber-100 uppercase">
            BOOST
          </span>
        </button>
      </div>
    </div>
  );
}
