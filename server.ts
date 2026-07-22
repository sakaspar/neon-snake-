/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  Player,
  Orb,
  WORLD_SIZE,
  BASE_SPEED,
  BOOST_SPEED,
  TICK_RATE,
  MAX_ORBS,
  INITIAL_LENGTH,
  SEGMENT_SPACING,
  TURN_SPEED,
} from './src/shared/types.ts';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const PORT = 3000;

const COLORS = [
  '#ff7eb3', // vibrant pink
  '#ffb86c', // vibrant orange
  '#f1fa8c', // vibrant yellow
  '#50fa7b', // vibrant green
  '#8be9fd', // vibrant blue
  '#bd93f9', // vibrant purple
];

const state: GameState = {
  players: {},
  orbs: {},
  leaderboard: [],
};

function spawnOrb(x?: number, y?: number, value = 1, color?: string, force = false) {
  if (!force && Object.keys(state.orbs).length >= MAX_ORBS) return;

  let spawnX = x;
  let spawnY = y;

  if (spawnX === undefined || spawnY === undefined) {
    const activePlayers = Object.values(state.players).filter(p => p.state === 'alive');
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

  const id = uuidv4();
  state.orbs[id] = {
    id,
    x: spawnX,
    y: spawnY,
    value,
    color: color ?? COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}

// Spawns a field of orbs around a specific center point
function spawnOrbCluster(cx: number, cy: number, count = 50, radius = 70) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;
    spawnOrb(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist);
  }
}

// Initial orbs near origin
spawnOrbCluster(0, 0, 150, 100);

let snakeCounter = 1;

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('join', (options?: { skinId?: string; bonusScore?: number }) => {
    const name = `Snake-${snakeCounter++}`;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const skinId = options?.skinId || 'cyberpunk';
    const bonusScore = options?.bonusScore || 0;
    const initialScore = INITIAL_LENGTH + bonusScore;

    // Spawn near center or existing player
    const startX = (Math.random() - 0.5) * 60;
    const startY = (Math.random() - 0.5) * 60;
    const angle = Math.random() * Math.PI * 2;

    const segments = [];
    for (let i = 0; i < initialScore; i++) {
      segments.push({
        x: startX - Math.cos(angle) * i * SEGMENT_SPACING,
        y: startY - Math.sin(angle) * i * SEGMENT_SPACING,
      });
    }

    state.players[socket.id] = {
      id: socket.id,
      name,
      color,
      skinId,
      segments,
      score: initialScore,
      isBoosting: false,
      state: 'alive',
      currentAngle: angle,
      inputs: { left: false, right: false, boost: false },
    };

    // Immediately populate orbs surrounding the new player's spawn point
    spawnOrbCluster(startX, startY, 70, 80);

    socket.emit('init', socket.id);
  });

  socket.on('update_state', (data: { segments: any[], score: number, currentAngle: number, isBoosting: boolean, state: string }) => {
    const player = state.players[socket.id];
    if (player && player.state === 'alive') {
      player.segments = data.segments;
      player.score = data.score;
      player.currentAngle = data.currentAngle;
      player.isBoosting = data.isBoosting;
      
      if (data.state === 'dead') {
        player.state = 'dead';
        // Drop orbs
        player.segments.forEach((seg, i) => {
          if (i % 2 === 0) spawnOrb(seg.x, seg.y, 1, player.color, true);
        });
      }
    }
  });

  socket.on('collect_orb', (orbId: string) => {
    if (state.orbs[orbId]) {
      delete state.orbs[orbId];
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    const player = state.players[socket.id];
    if (player && player.state === 'alive') {
      // Drop orbs
      player.segments.forEach((seg, i) => {
        if (i % 2 === 0) spawnOrb(seg.x, seg.y, 1, player.color, true);
      });
    }
    delete state.players[socket.id];
  });
});

let tickCounter = 0;

// Game Loop
setInterval(() => {
  tickCounter++;

  // Update players (just for boosting orb drops)
  for (const id in state.players) {
    const player = state.players[id];
    if (player.state === 'alive' && player.isBoosting) {
      if (Math.random() < 0.15 && player.segments.length > 0) {
        const tail = player.segments[player.segments.length - 1];
        spawnOrb(tail.x, tail.y, 1, player.color, true);
      }
    }
  }

  // Ensure every active player has plenty of food orbs nearby on the infinite map
  const activePlayers = Object.values(state.players).filter(p => p.state === 'alive');
  if (activePlayers.length > 0) {
    for (const p of activePlayers) {
      const head = p.segments[0];
      if (!head) continue;

      // Count local orbs around this player
      let localOrbCount = 0;
      for (const orbId in state.orbs) {
        const orb = state.orbs[orbId];
        const dx = orb.x - head.x;
        const dy = orb.y - head.y;
        if (dx * dx + dy * dy < 100 * 100) {
          localOrbCount++;
        }
      }

      // If local density is below threshold, spawn orbs in direction of movement / around head
      if (localOrbCount < 60) {
        for (let i = 0; i < 5; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 10 + Math.random() * 85;
          spawnOrb(head.x + Math.cos(angle) * dist, head.y + Math.sin(angle) * dist);
        }
      }
    }
  } else if (Object.keys(state.orbs).length < 150) {
    // If no players, keep central food field ready
    spawnOrbCluster(0, 0, 20, 100);
  }

  // Periodic cleanup of distant orbs far from any active player (every 30 ticks = 0.5s)
  if (tickCounter % 30 === 0 && activePlayers.length > 0) {
    for (const orbId in state.orbs) {
      const orb = state.orbs[orbId];
      let minSqDist = Infinity;
      for (const p of activePlayers) {
        if (p.segments.length > 0) {
          const dx = orb.x - p.segments[0].x;
          const dy = orb.y - p.segments[0].y;
          const sqDist = dx * dx + dy * dy;
          if (sqDist < minSqDist) minSqDist = sqDist;
        }
      }
      // If orb is farther than 160 units from all active players, delete it
      if (minSqDist > 160 * 160) {
        delete state.orbs[orbId];
      }
    }
  }

  // Update leaderboard
  state.leaderboard = Object.values(state.players)
    .filter(p => p.state === 'alive')
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(p => ({ id: p.id, name: p.name, score: Math.floor(p.score), color: p.color, skinId: p.skinId }));

  // Broadcast state
  io.emit('state', state);

}, 1000 / TICK_RATE);

async function startServer() {
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
