/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useEffect, useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore, globalGameState } from '../store/gameStore';
import { mobileInputState } from '../store/inputStore';
import { WORLD_SIZE, TURN_SPEED, BOOST_SPEED, BASE_SPEED } from '../shared/types';
import * as THREE from 'three';
import { Sphere, Grid } from '@react-three/drei';

import { getSkinById } from '../shared/skins';
import { soundManager } from '../lib/soundManager';

const localCollectedOrbs = new Set<string>();

function Snake({ playerId, color, isLocal }: { playerId: string, color: string, isLocal: boolean }) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.Group>(null);
  const headSphereRef = useRef<THREE.Mesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentPositions = useRef<{x: number, y: number}[]>([]);
  const segmentColor = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    if (!bodyRef.current || !headRef.current) return;
    const gs = globalGameState.current;
    if (!gs) return;
    
    const player = gs.players[playerId];
    if (!player || player.segments.length === 0) {
      bodyRef.current.count = 0;
      headRef.current.visible = false;
      return;
    }
    
    headRef.current.visible = true;
    const count = player.segments.length;
    bodyRef.current.count = Math.max(0, count - 1);
    
    const skin = getSkinById(player.skinId || 'cyberpunk');

    while (currentPositions.current.length < count) {
      const idx = currentPositions.current.length;
      currentPositions.current.push({ 
        x: player.segments[idx]?.x || 0, 
        y: player.segments[idx]?.y || 0 
      });
    }

    for (let i = 0; i < count; i++) {
      let targetX = player.segments[i].x;
      let targetY = player.segments[i].y;
      
      const curr = currentPositions.current[i];
      if (isLocal) {
        curr.x = targetX;
        curr.y = targetY;
      } else {
        const dist = Math.abs(targetX - curr.x) + Math.abs(targetY - curr.y);
        if (dist > 10) {
          curr.x = targetX;
          curr.y = targetY;
        } else {
          const lerpFactor = 15;
          curr.x += (targetX - curr.x) * lerpFactor * delta;
          curr.y += (targetY - curr.y) * lerpFactor * delta;
        }
      }
      
      if (i === 0) {
        headRef.current.position.set(curr.x, curr.y, 0.5);
        if (player.currentAngle !== undefined) {
          headRef.current.rotation.z = player.currentAngle;
        }
      } else {
        dummy.position.set(curr.x, curr.y, 0.5);
        dummy.updateMatrix();
        bodyRef.current.setMatrixAt(i - 1, dummy.matrix);

        // Calculate dynamic skin color for body segment
        if (skin.id === 'rainbow') {
          const hue = ((i * 12 + state.clock.elapsedTime * 60) % 360) / 360;
          segmentColor.setHSL(hue, 0.9, 0.55);
        } else if (skin.id === 'golden') {
          if (i % 3 === 0) segmentColor.set('#ffffff');
          else segmentColor.set(skin.bodyColor);
        } else {
          // Gradient interpolation between headColor and bodyColor
          const factor = Math.min(1, i / 20);
          segmentColor.set(skin.headColor).lerp(new THREE.Color(skin.bodyColor), factor);
        }

        bodyRef.current.setColorAt(i - 1, segmentColor);
      }
    }
    bodyRef.current.instanceMatrix.needsUpdate = true;
    if (bodyRef.current.instanceColor) {
      bodyRef.current.instanceColor.needsUpdate = true;
    }
  });

  const gs = globalGameState.current;
  const player = gs?.players[playerId];
  const skin = getSkinById(player?.skinId || 'cyberpunk');

  return (
    <group>
      {/* Head with glowing eyes */}
      <group ref={headRef}>
        <Sphere ref={headSphereRef} castShadow receiveShadow args={[0.8, 16, 16]}>
          <meshStandardMaterial
            color={skin.headColor}
            roughness={0.15}
            metalness={0.85}
            toneMapped={false}
            onBeforeCompile={(shader) => {
              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <emissivemap_fragment>',
                `
                #include <emissivemap_fragment>
                float fresnel = pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), 2.0);
                totalEmissiveRadiance += diffuseColor.rgb * (0.6 + fresnel * 3.5);
                `
              );
            }}
          />
        </Sphere>
        {/* Left Eye */}
        <mesh position={[0.4, 0.35, 0.3]}>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshBasicMaterial color={skin.glowColor} />
        </mesh>
        {/* Right Eye */}
        <mesh position={[0.4, -0.35, 0.3]}>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshBasicMaterial color={skin.glowColor} />
        </mesh>
      </group>

      <instancedMesh ref={bodyRef} args={[null as any, null as any, 2000]} castShadow receiveShadow frustumCulled={false}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial
          roughness={0.2}
          metalness={0.8}
          toneMapped={false}
          onBeforeCompile={(shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <emissivemap_fragment>',
              `
              #include <emissivemap_fragment>
              float fresnel = pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), 2.0);
              totalEmissiveRadiance += diffuseColor.rgb * (0.4 + fresnel * 2.0);
              `
            );
          }}
        />
      </instancedMesh>
    </group>
  );
}

function Orbs() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const gs = globalGameState.current;
    if (!gs) return;

    let i = 0;
    const time = state.clock.elapsedTime;

    for (const orbId in gs.orbs) {
      if (localCollectedOrbs.has(orbId)) continue;
      const orb = gs.orbs[orbId];
      // Subtle pulse scale effect for glowing food orbs
      const pulse = 1.0 + Math.sin(time * 5 + orb.x * 2 + orb.y) * 0.15;
      const scale = (orb.value > 1 ? 0.7 : 0.5) * pulse;

      dummy.position.set(orb.x, orb.y, 0.5);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
      colorObj.set(orb.color);
      meshRef.current.setColorAt(i, colorObj);
      i++;
    }
    meshRef.current.count = i;
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, 1500]} castShadow receiveShadow frustumCulled={false}>
      <sphereGeometry args={[1.0, 16, 16]} />
      <meshStandardMaterial
        roughness={0.2}
        metalness={0.5}
        toneMapped={false}
        onBeforeCompile={(shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            `
            #include <emissivemap_fragment>
            totalEmissiveRadiance += diffuseColor.rgb * 3.5;
            `
          );
        }}
      />
    </instancedMesh>
  );
}

function InfiniteEnvironment() {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (groupRef.current) {
      // Snap position to 10-unit section intervals so neon grid pattern remains seamless
      groupRef.current.position.x = Math.floor(camera.position.x / 10) * 10;
      groupRef.current.position.y = Math.floor(camera.position.y / 10) * 10;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Dynamic Ground plane */}
      <mesh receiveShadow position={[0, 0, -0.2]}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>

      {/* Dynamic Infinite Grid */}
      <Grid
        position={[0, 0, -0.1]}
        rotation={[Math.PI / 2, 0, 0]}
        args={[1000, 1000]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1e3a8a"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#3b82f6"
        fadeDistance={200}
        fadeStrength={1}
      />
    </group>
  );
}

export function GameScene() {
  const { gameState, playerId, sendPlayerState, sendCollectOrb } = useGameStore();
  const { camera } = useThree();
  const inputs = useRef({ left: false, right: false, boost: false, brake: false });
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const [lightTarget] = useState(() => new THREE.Object3D());

  const localPlayerRef = useRef<{
    active: boolean;
    segments: {x: number, y: number}[];
    score: number;
    currentAngle: number;
    isBoosting: boolean;
    lastSendTime: number;
  }>({
    active: false,
    segments: [],
    score: 10,
    currentAngle: 0,
    isBoosting: false,
    lastSendTime: 0,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && !inputs.current.left) { inputs.current.left = true; }
      if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && !inputs.current.right) { inputs.current.right = true; }
      if ((e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') && !inputs.current.boost) { inputs.current.boost = true; }
      if ((e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') && !inputs.current.brake) { inputs.current.brake = true; }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && inputs.current.left) { inputs.current.left = false; }
      if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && inputs.current.right) { inputs.current.right = false; }
      if ((e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') && inputs.current.boost) { inputs.current.boost = false; }
      if ((e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') && inputs.current.brake) { inputs.current.brake = false; }
    };

    const handleBlur = () => {
      inputs.current = { left: false, right: false, boost: false, brake: false };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useFrame((state, delta) => {
    const gs = globalGameState.current;
    if (!gs || !playerId) return;
    
    const serverPlayer = gs.players[playerId];
    if (serverPlayer && serverPlayer.state === 'alive') {
      
      // Initialize from server if not active
      if (!localPlayerRef.current.active && serverPlayer.segments.length > 0) {
        localPlayerRef.current.active = true;
        localPlayerRef.current.segments = [...serverPlayer.segments];
        localPlayerRef.current.score = serverPlayer.score;
        localPlayerRef.current.currentAngle = serverPlayer.currentAngle;
      }

      if (!localPlayerRef.current.active) return;

      // Local movement logic combining keyboard & mobile touch inputs
      const isLeft = inputs.current.left || mobileInputState.left;
      const isRight = inputs.current.right || mobileInputState.right;
      const isBoost = inputs.current.boost || mobileInputState.boost;
      const isBrake = inputs.current.brake || mobileInputState.brake;

      if (mobileInputState.joystickActive) {
        let angleDiff = mobileInputState.joystickAngle - localPlayerRef.current.currentAngle;
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

        const maxTurn = TURN_SPEED * delta;
        if (Math.abs(angleDiff) <= maxTurn) {
          localPlayerRef.current.currentAngle = mobileInputState.joystickAngle;
        } else if (angleDiff > 0) {
          localPlayerRef.current.currentAngle += maxTurn;
        } else {
          localPlayerRef.current.currentAngle -= maxTurn;
        }
      } else {
        if (isLeft) localPlayerRef.current.currentAngle += TURN_SPEED * delta;
        if (isRight) localPlayerRef.current.currentAngle -= TURN_SPEED * delta;
      }
      
      localPlayerRef.current.isBoosting = isBoost && localPlayerRef.current.score > 10;
      let speed = localPlayerRef.current.isBoosting ? BOOST_SPEED : BASE_SPEED;
      if (isBrake && !localPlayerRef.current.isBoosting) {
        speed = BASE_SPEED * 0.5;
      }
      
      const head = { ...localPlayerRef.current.segments[0] };
      head.x += Math.cos(localPlayerRef.current.currentAngle) * speed * delta;
      head.y += Math.sin(localPlayerRef.current.currentAngle) * speed * delta;

      // Map is infinite: head moves continuously without boundary clamping!

      localPlayerRef.current.segments.unshift(head);

      if (localPlayerRef.current.isBoosting) {
        localPlayerRef.current.score -= 2 * delta;
        if (localPlayerRef.current.score <= 10) {
          localPlayerRef.current.isBoosting = false;
          localPlayerRef.current.score = 10;
        }
      }

      const targetLength = Math.floor(localPlayerRef.current.score);
      while (localPlayerRef.current.segments.length > targetLength) {
        localPlayerRef.current.segments.pop();
      }

      // Check orb collisions
      for (const orbId in gs.orbs) {
        if (localCollectedOrbs.has(orbId)) continue;
        const orb = gs.orbs[orbId];
        const dx = head.x - orb.x;
        const dy = head.y - orb.y;
        if (dx * dx + dy * dy < 4) {
          localPlayerRef.current.score += orb.value;
          localCollectedOrbs.add(orbId);
          delete gs.orbs[orbId]; // predict locally
          sendCollectOrb(orbId);
          soundManager.playEatSound();
        }
      }

      // Cleanup localCollectedOrbs occasionally
      if (Math.random() < 0.05) {
        for (const id of localCollectedOrbs) {
          if (!gs.orbs[id]) localCollectedOrbs.delete(id);
        }
      }

      // Check player collisions
      let collided = false;
      for (const otherId in gs.players) {
        if (otherId === playerId) continue;
        const other = gs.players[otherId];
        if (other.state !== 'alive') continue;
        for (const seg of other.segments) {
          const dx = head.x - seg.x;
          const dy = head.y - seg.y;
          if (dx * dx + dy * dy < 2.25) {
            collided = true;
            break;
          }
        }
        if (collided) break;
      }

      if (collided) {
        localPlayerRef.current.active = false;
        soundManager.playDeathSound();
        sendPlayerState({
          segments: localPlayerRef.current.segments,
          score: localPlayerRef.current.score,
          currentAngle: localPlayerRef.current.currentAngle,
          isBoosting: localPlayerRef.current.isBoosting,
          state: 'dead'
        });
        return;
      }

      // Overwrite global state for local rendering
      gs.players[playerId].segments = localPlayerRef.current.segments;
      gs.players[playerId].score = localPlayerRef.current.score;
      gs.players[playerId].currentAngle = localPlayerRef.current.currentAngle;
      gs.players[playerId].isBoosting = localPlayerRef.current.isBoosting;

      // Send state to server at 20Hz
      const now = Date.now();
      if (now - localPlayerRef.current.lastSendTime > 50) {
        sendPlayerState({
          segments: localPlayerRef.current.segments,
          score: localPlayerRef.current.score,
          currentAngle: localPlayerRef.current.currentAngle,
          isBoosting: localPlayerRef.current.isBoosting,
          state: 'alive'
        });
        localPlayerRef.current.lastSendTime = now;
      }

      const targetZ = Math.min(45, Math.max(20, 20 + localPlayerRef.current.score * 0.2));
      
      // Smooth camera follow predicted head
      camera.position.x += (head.x - camera.position.x) * 10 * delta;
      camera.position.y += (head.y - camera.position.y) * 10 * delta;
      camera.position.z += (targetZ - camera.position.z) * 4 * delta;
      camera.lookAt(camera.position.x, camera.position.y, 0);

      // Make the directional light follow the camera to keep shadows crisp
      if (lightRef.current) {
        lightRef.current.position.set(camera.position.x + 10, camera.position.y - 10, 30);
        lightTarget.position.set(camera.position.x, camera.position.y, 0);
      }
    } else {
      localPlayerRef.current.active = false;
    }
  });

  if (!gameState) return null;

  return (
    <>
      <ambientLight intensity={0.4} />
      
      <directionalLight
        ref={lightRef}
        target={lightTarget}
        castShadow
        intensity={2}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={0.1}
        shadow-camera-far={100}
        shadow-bias={-0.001}
      />
      <primitive object={lightTarget} />

      <InfiniteEnvironment />

      <Orbs />

      {Object.values(gameState.players).map((player) => {
        if (player.state !== 'alive' || player.segments.length === 0) return null;
        return (
          <Snake
            key={player.id}
            playerId={player.id}
            color={player.color}
            isLocal={player.id === playerId}
          />
        );
      })}
    </>
  );
}
