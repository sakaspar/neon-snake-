/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { mobileInputState } from '../store/inputStore';
import { Zap, Shield, Navigation } from 'lucide-react';

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

  const leftZoneRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);

  const maxRadius = 50; // max joystick knob distance

  // Touch / Pointer handler for Joystick on left zone
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (activePointerId.current !== null) return;
    
    const targetElement = leftZoneRef.current || (e.currentTarget as HTMLElement | null);
    if (!targetElement) return;

    activePointerId.current = e.pointerId;
    try {
      targetElement.setPointerCapture(e.pointerId);
    } catch {}

    const rect = targetElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setJoystick({
      active: true,
      baseX: x,
      baseY: y,
      knobX: 0,
      knobY: 0,
      angleDeg: 0,
    });

    mobileInputState.joystickActive = false;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    e.preventDefault();

    const targetElement = leftZoneRef.current || (e.currentTarget as HTMLElement | null);
    if (!targetElement) return;

    const rect = targetElement.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

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
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current === e.pointerId) {
      activePointerId.current = null;
      const targetElement = leftZoneRef.current || (e.currentTarget as HTMLElement | null);
      if (targetElement) {
        try {
          if (targetElement.hasPointerCapture(e.pointerId)) {
            targetElement.releasePointerCapture(e.pointerId);
          }
        } catch {}
      }

      setJoystick((prev) => ({ ...prev, active: false, knobX: 0, knobY: 0 }));
      mobileInputState.joystickActive = false;
    }
  }, []);

  // Boost button handlers
  const handleBoostDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBoostActive(true);
    mobileInputState.boost = true;
    if ('vibrate' in navigator) navigator.vibrate(20);
  };

  const handleBoostUp = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBoostActive(false);
    mobileInputState.boost = false;
  };

  // Brake button handlers
  const handleBrakeDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBrakeActive(true);
    mobileInputState.brake = true;
    if ('vibrate' in navigator) navigator.vibrate(15);
  };

  const handleBrakeUp = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBrakeActive(false);
    mobileInputState.brake = false;
  };

  // Reset inputs on unmount
  useEffect(() => {
    return () => {
      mobileInputState.joystickActive = false;
      mobileInputState.boost = false;
      mobileInputState.brake = false;
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none select-none touch-none z-30 overflow-hidden">
      {/* Left Joystick Touch Area */}
      <div
        ref={leftZoneRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="absolute left-0 top-0 bottom-0 w-1/2 pointer-events-auto touch-none"
      >
        {/* Dynamic / Static Joystick Render */}
        {joystick.active ? (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-75"
            style={{ left: `${joystick.baseX}px`, top: `${joystick.baseY}px` }}
          >
            {/* Base Ring */}
            <div className="w-28 h-28 rounded-full border-2 border-cyan-400/50 bg-cyan-950/40 backdrop-blur-md shadow-[0_0_25px_rgba(34,211,238,0.3)] flex items-center justify-center relative">
              {/* Direction Indicator */}
              <div
                className="absolute w-full h-full flex items-center justify-center transition-transform duration-75"
                style={{ transform: `rotate(${-joystick.angleDeg}deg)` }}
              >
                <Navigation className="text-cyan-400/80 w-5 h-5 absolute right-1 rotate-90" />
              </div>

              {/* Inner Crosshair Lines */}
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <div className="w-full h-[1px] bg-cyan-400" />
                <div className="h-full w-[1px] bg-cyan-400 absolute" />
              </div>

              {/* Moveable Knob */}
              <div
                className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 border border-white/80 shadow-[0_0_15px_rgba(34,211,238,0.8)] flex items-center justify-center transition-transform duration-75"
                style={{
                  transform: `translate(${joystick.knobX}px, ${joystick.knobY}px)`,
                }}
              >
                <div className="w-4 h-4 rounded-full bg-white/90 shadow-inner" />
              </div>
            </div>
          </div>
        ) : (
          /* Default Resting Joystick Indicator */
          <div className="absolute left-8 bottom-12 pointer-events-none opacity-60 sm:opacity-40">
            <div className="w-28 h-28 rounded-full border border-dashed border-cyan-400/40 bg-cyan-950/20 backdrop-blur-sm flex items-center justify-center relative animate-pulse">
              <div className="w-10 h-10 rounded-full border border-cyan-400/60 bg-cyan-500/10 flex items-center justify-center">
                <Navigation className="text-cyan-300 w-5 h-5" />
              </div>
              <span className="absolute -bottom-6 text-[11px] font-mono font-semibold text-cyan-300 tracking-wider uppercase">
                TOUCH TO STEER
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Right Action Buttons Area */}
      <div className="absolute right-3 sm:right-6 bottom-3 sm:bottom-6 flex items-end gap-2.5 sm:gap-4 pointer-events-auto touch-none">
        {/* BRAKE / PRECISION BUTTON */}
        <div className="flex flex-col items-center gap-1">
          <button
            onPointerDown={handleBrakeDown}
            onPointerUp={handleBrakeUp}
            onPointerLeave={handleBrakeUp}
            onPointerCancel={handleBrakeUp}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center border-2 transition-all duration-100 active:scale-90 ${
              isBrakeActive
                ? 'bg-blue-600 border-cyan-300 shadow-[0_0_25px_rgba(59,130,246,0.9)] scale-95'
                : 'bg-gradient-to-br from-blue-900/80 to-slate-900/80 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)] backdrop-blur-md'
            }`}
          >
            <Shield className={`w-5 h-5 sm:w-6 sm:h-6 ${isBrakeActive ? 'text-white' : 'text-cyan-300'}`} />
            <span className="text-[8px] sm:text-[9px] font-black tracking-wider text-cyan-200 mt-0.5 uppercase">
              BRAKE
            </span>
          </button>
        </div>

        {/* BOOST BUTTON */}
        <div className="flex flex-col items-center gap-1">
          <button
            onPointerDown={handleBoostDown}
            onPointerUp={handleBoostUp}
            onPointerLeave={handleBoostUp}
            onPointerCancel={handleBoostUp}
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center border-2 transition-all duration-100 active:scale-90 ${
              isBoostActive
                ? 'bg-gradient-to-tr from-amber-500 to-rose-500 border-yellow-200 shadow-[0_0_35px_rgba(245,158,11,1)] scale-95'
                : 'bg-gradient-to-tr from-amber-600/80 to-orange-950/80 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.4)] backdrop-blur-md'
            }`}
          >
            <Zap className={`w-6 h-6 sm:w-8 sm:h-8 ${isBoostActive ? 'text-yellow-100 animate-bounce' : 'text-amber-300'}`} />
            <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-amber-100 uppercase">
              BOOST
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
