/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GameState, Player, Orb, BASE_SPEED, BOOST_SPEED, TURN_SPEED } from '../shared/types';
import { SKINS, Skin } from '../shared/skins';

const BOT_NAMES = [
  'ViperX', 'NeonSlayer', 'ApexWorm', 'CyberCobra', 'PrismPython',
  'SolarSerpent', 'GlitchSnake', 'DarkMatter', 'HyperScale', 'OrbitX',
  'QuantumWorm', 'StarlightViper', 'OmegaSerpent', 'VoltCobra', 'AuraPython'
];

const BOT_COUNT = 14;
const LOCAL_PLAYER_ID = 'local_player';

export class StandaloneGameEngine {
  private state: GameState;
  private botAngles: Record<string, number> = {};
  private botTargetAngles: Record<string, number> = {};
  private botChangeTimer: Record<string, number> = {};
  private tickInterval: number | null = null;
  private listeners: ((state: GameState) => void)[] = [];
  private orbCounter = 0;

  constructor() {
    this.state = {
      players: {},
      orbs: {},
      leaderboard: [],
    };
  }

  public start() {
    if (this.tickInterval !== null) return;

    // Initial bot population
    this.ensureBots();
    // Initial food cluster at origin
    this.spawnFoodCluster(0, 0, 150, 100);

    // 60 FPS / 60 Hz physics loop
    let lastTime = performance.now();
    this.tickInterval = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      this.update(delta);
    }, 1000 / 60);
  }

  public stop() {
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  public subscribe(fn: (state: GameState) => void) {
    this.listeners.push(fn);
    fn(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  public getLocalPlayerId(): string {
    return LOCAL_PLAYER_ID;
  }

  public getState(): GameState {
    return this.state;
  }

  public joinPlayer(options?: { skinId?: string; bonusScore?: number }) {
    const skinId = options?.skinId || 'cyberpunk';
    const bonusScore = options?.bonusScore || 0;
    const initialScore = 10 + bonusScore;

    // Find local player or spawn near current center or origin
    const activePlayers = Object.values(this.state.players).filter((p) => p.state === 'alive');
    let startX = 0;
    let startY = 0;
    if (activePlayers.length > 0) {
      const p = activePlayers[Math.floor(Math.random() * activePlayers.length)];
      if (p.segments[0]) {
        startX = p.segments[0].x + (Math.random() - 0.5) * 40;
        startY = p.segments[0].y + (Math.random() - 0.5) * 40;
      }
    }

    const angle = Math.random() * Math.PI * 2;
    const segments = [];
    for (let i = 0; i < initialScore; i++) {
      segments.push({
        x: startX - Math.cos(angle) * i * 0.5,
        y: startY - Math.sin(angle) * i * 0.5,
      });
    }

    this.state.players[LOCAL_PLAYER_ID] = {
      id: LOCAL_PLAYER_ID,
      name: 'You (Player)',
      color: '#00f0ff',
      skinId,
      segments,
      score: initialScore,
      isBoosting: false,
      state: 'alive',
      currentAngle: angle,
      inputs: { left: false, right: false, boost: false },
    };

    // Immediately spawn dense food cluster around player's head!
    this.spawnFoodCluster(startX, startY, 80, 75);
    this.notify();
  }

  public updateLocalPlayerState(data: {
    segments: { x: number; y: number }[];
    score: number;
    currentAngle: number;
    isBoosting: boolean;
    state: 'alive' | 'dead';
  }) {
    const p = this.state.players[LOCAL_PLAYER_ID];
    if (!p) return;

    p.segments = data.segments;
    p.score = data.score;
    p.currentAngle = data.currentAngle;
    p.isBoosting = data.isBoosting;
    
    if (data.state === 'dead' && p.state === 'alive') {
      p.state = 'dead';
      // Explode player body into food
      this.explodeSnakeIntoFood(p);
    }
  }

  public collectOrb(orbId: string, collectorId = LOCAL_PLAYER_ID) {
    const orb = this.state.orbs[orbId];
    if (orb) {
      delete this.state.orbs[orbId];
      const p = this.state.players[collectorId];
      if (p && p.state === 'alive') {
        p.score += orb.value;
      }
    }
  }

  private spawnOrb(x?: number, y?: number, value = 1, color?: string) {
    if (Object.keys(this.state.orbs).length >= 1200) return;

    let spawnX = x;
    let spawnY = y;

    if (spawnX === undefined || spawnY === undefined) {
      const activePlayers = Object.values(this.state.players).filter((p) => p.state === 'alive');
      if (activePlayers.length > 0) {
        const p = activePlayers[Math.floor(Math.random() * activePlayers.length)];
        const head = p.segments[0] || { x: 0, y: 0 };
        const angle = Math.random() * Math.PI * 2;
        const dist = 5 + Math.random() * 80;
        spawnX = head.x + Math.cos(angle) * dist;
        spawnY = head.y + Math.sin(angle) * dist;
      } else {
        spawnX = (Math.random() - 0.5) * 150;
        spawnY = (Math.random() - 0.5) * 150;
      }
    }

    const orbColors = ['#00f0ff', '#ff007f', '#39ff14', '#ffe600', '#b026ff', '#00ffcc', '#ff6600'];
    const id = `orb_${++this.orbCounter}_${Math.random().toString(36).substring(2, 6)}`;
    this.state.orbs[id] = {
      id,
      x: spawnX,
      y: spawnY,
      value,
      color: color || orbColors[Math.floor(Math.random() * orbColors.length)],
    };
  }

  private spawnFoodCluster(cx: number, cy: number, count = 50, radius = 70) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      this.spawnOrb(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist);
    }
  }

  private explodeSnakeIntoFood(player: Player) {
    for (let i = 0; i < player.segments.length; i += 2) {
      const seg = player.segments[i];
      if (seg) {
        const value = 2 + Math.floor(Math.random() * 3);
        this.spawnOrb(seg.x + (Math.random() - 0.5) * 2, seg.y + (Math.random() - 0.5) * 2, value, player.color);
      }
    }
  }

  private ensureBots() {
    const currentBots = Object.values(this.state.players).filter((p) => p.id !== LOCAL_PLAYER_ID && p.state === 'alive');
    const needed = BOT_COUNT - currentBots.length;

    for (let i = 0; i < needed; i++) {
      const botId = `bot_${Math.random().toString(36).substring(2, 8)}`;
      const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      const skin = SKINS[Math.floor(Math.random() * SKINS.length)];
      const initialScore = 12 + Math.floor(Math.random() * 45);

      // Spawn near active player or relative center
      const player = this.state.players[LOCAL_PLAYER_ID];
      let startX = (Math.random() - 0.5) * 100;
      let startY = (Math.random() - 0.5) * 100;
      if (player && player.state === 'alive' && player.segments[0]) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 90;
        startX = player.segments[0].x + Math.cos(angle) * dist;
        startY = player.segments[0].y + Math.sin(angle) * dist;
      }

      const startAngle = Math.random() * Math.PI * 2;
      const segments = [];
      for (let s = 0; s < initialScore; s++) {
        segments.push({
          x: startX - Math.cos(startAngle) * s * 0.5,
          y: startY - Math.sin(startAngle) * s * 0.5,
        });
      }

      this.state.players[botId] = {
        id: botId,
        name,
        color: skin.headColor,
        skinId: skin.id,
        segments,
        score: initialScore,
        isBoosting: false,
        state: 'alive',
        currentAngle: startAngle,
        inputs: { left: false, right: false, boost: false },
      };

      this.botAngles[botId] = startAngle;
      this.botTargetAngles[botId] = startAngle;
      this.botChangeTimer[botId] = 0;
    }
  }

  private update(delta: number) {
    this.ensureBots();

    // 1. Update AI Bots
    const activeSnakes = Object.values(this.state.players).filter((p) => p.state === 'alive');

    for (const bot of activeSnakes) {
      if (bot.id === LOCAL_PLAYER_ID) continue;

      const head = bot.segments[0];
      if (!head) continue;

      this.botChangeTimer[bot.id] = (this.botChangeTimer[bot.id] || 0) - delta;

      // AI Decision logic
      if (this.botChangeTimer[bot.id] <= 0) {
        this.botChangeTimer[bot.id] = 0.5 + Math.random() * 1.5;

        // Search for nearest food orb
        let nearestOrb: Orb | null = null;
        let minOrbDistSq = 40 * 40;

        for (const orbId in this.state.orbs) {
          const orb = this.state.orbs[orbId];
          const dx = orb.x - head.x;
          const dy = orb.y - head.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < minOrbDistSq) {
            minOrbDistSq = distSq;
            nearestOrb = orb;
          }
        }

        if (nearestOrb) {
          // Steer towards food
          this.botTargetAngles[bot.id] = Math.atan2(nearestOrb.y - head.y, nearestOrb.x - head.x);
        } else {
          // Random wander
          this.botTargetAngles[bot.id] = (this.botAngles[bot.id] || 0) + (Math.random() - 0.5) * 1.5;
        }

        // Avoid other snakes
        for (const other of activeSnakes) {
          if (other.id === bot.id) continue;
          for (let i = 0; i < other.segments.length; i += 3) {
            const seg = other.segments[i];
            const dx = seg.x - head.x;
            const dy = seg.y - head.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 10 * 10) {
              // Steer away!
              const avoidAngle = Math.atan2(dy, dx) + Math.PI;
              this.botTargetAngles[bot.id] = avoidAngle;
              break;
            }
          }
        }
      }

      // Smoothly turn bot towards target angle
      let angleDiff = (this.botTargetAngles[bot.id] || 0) - (this.botAngles[bot.id] || 0);
      angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
      const maxTurn = TURN_SPEED * delta;
      
      if (Math.abs(angleDiff) <= maxTurn) {
        this.botAngles[bot.id] = this.botTargetAngles[bot.id];
      } else if (angleDiff > 0) {
        this.botAngles[bot.id] += maxTurn;
      } else {
        this.botAngles[bot.id] -= maxTurn;
      }

      bot.currentAngle = this.botAngles[bot.id];

      // Occasional boost
      bot.isBoosting = Math.random() < 0.08 && bot.score > 20;
      const speed = bot.isBoosting ? BOOST_SPEED : BASE_SPEED;

      // Move head
      const newHead = {
        x: head.x + Math.cos(bot.currentAngle) * speed * delta,
        y: head.y + Math.sin(bot.currentAngle) * speed * delta,
      };

      bot.segments.unshift(newHead);

      if (bot.isBoosting) {
        bot.score -= 2 * delta;
        if (Math.random() < 0.2) {
          const tail = bot.segments[bot.segments.length - 1];
          if (tail) this.spawnOrb(tail.x, tail.y, 1, bot.color);
        }
      }

      const targetLen = Math.floor(bot.score);
      while (bot.segments.length > targetLen) {
        bot.segments.pop();
      }

      // Check bot eating food
      for (const orbId in this.state.orbs) {
        const orb = this.state.orbs[orbId];
        const dx = newHead.x - orb.x;
        const dy = newHead.y - orb.y;
        if (dx * dx + dy * dy < 4) {
          bot.score += orb.value;
          delete this.state.orbs[orbId];
        }
      }

      // Check bot collisions with other snakes
      let botDied = false;
      for (const other of activeSnakes) {
        if (other.id === bot.id) continue;
        for (const seg of other.segments) {
          const dx = newHead.x - seg.x;
          const dy = newHead.y - seg.y;
          if (dx * dx + dy * dy < 2.25) {
            botDied = true;
            break;
          }
        }
        if (botDied) break;
      }

      if (botDied) {
        bot.state = 'dead';
        this.explodeSnakeIntoFood(bot);
        delete this.state.players[bot.id];
      }
    }

    // 2. Ensure food density around active players & clean up distant food
    for (const p of activeSnakes) {
      const head = p.segments[0];
      if (!head) continue;

      let localOrbs = 0;
      for (const orbId in this.state.orbs) {
        const orb = this.state.orbs[orbId];
        const dx = orb.x - head.x;
        const dy = orb.y - head.y;
        if (dx * dx + dy * dy < 90 * 90) {
          localOrbs++;
        }
      }

      if (localOrbs < 50) {
        for (let i = 0; i < 4; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 5 + Math.random() * 80;
          this.spawnOrb(head.x + Math.cos(angle) * dist, head.y + Math.sin(angle) * dist);
        }
      }
    }

    // 3. Update Leaderboard
    this.state.leaderboard = Object.values(this.state.players)
      .filter((p) => p.state === 'alive')
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        name: p.name,
        score: Math.floor(p.score),
        color: p.color,
        skinId: p.skinId,
      }));

    this.notify();
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

export const standaloneEngine = new StandaloneGameEngine();
