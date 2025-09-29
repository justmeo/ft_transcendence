class MatchHub {
  constructor() {
    this.matches = new Map(); // matchId -> MatchState
    this.clients = new Map(); // userId -> WebSocket
    this.tickRate = 60; // 60 FPS server tick
    this.gameLoopInterval = null;
    this.disconnectTimeout = 30000; // 30 seconds
  }

  // Match state structure
  createMatchState(matchId, player1Id, player2Id) {
    const initialState = {
      matchId,
      player1Id,
      player2Id,
      status: 'waiting', // waiting, active, paused, finished
      
      // Game state
      ball: {
        x: 400, // Canvas center
        y: 200,
        vx: 250, // Velocity
        vy: 150,
        radius: 8
      },
      
      paddles: {
        left: { x: 20, y: 160, width: 20, height: 80, vy: 0 },
        right: { x: 760, y: 160, width: 20, height: 80, vy: 0 }
      },
      
      scores: { left: 0, right: 0 },
      maxScore: 5,
      
      // Connection state
      connectedPlayers: new Set(),
      playerSockets: new Map(),
      disconnectedAt: null,
      pausedAt: null,
      
      // Physics constants
      canvasWidth: 800,
      canvasHeight: 400,
      paddleSpeed: 400,
      ballMaxSpeed: 500,
      
      // Timing
      lastUpdate: Date.now(),
      gameStartTime: null
    };

    this.matches.set(matchId, initialState);
    return initialState;
  }

  // Player joins match room
  joinMatch(matchId, userId, socket) {
    let matchState = this.matches.get(matchId);
    
    if (!matchState) {
      // Create match state if it doesn't exist
      // Note: In real implementation, fetch match details from DB
      matchState = this.createMatchState(matchId, userId, null);
    }

    // Validate player can join this match
    if (matchState.player1Id !== userId && matchState.player2Id !== userId) {
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Not authorized to join this match'
      }));
      return false;
    }

    // Add player to match
    matchState.connectedPlayers.add(userId);
    matchState.playerSockets.set(userId, socket);
    this.clients.set(userId, socket);

    // Determine player side
    const playerSide = matchState.player1Id === userId ? 'left' : 'right';

    // Send initial state
    socket.send(JSON.stringify({
      type: 'matchJoined',
      matchId,
      playerSide,
      state: this.getClientGameState(matchState)
    }));

    // Start match if both players connected
    if (matchState.connectedPlayers.size === 2 && matchState.status === 'waiting') {
      this.startMatch(matchId);
    }

    // Handle socket events
    this.setupSocketHandlers(socket, matchId, userId);

    console.log(`Player ${userId} joined match ${matchId} as ${playerSide}`);
    return true;
  }

  // Setup WebSocket event handlers for a client
  setupSocketHandlers(socket, matchId, userId) {
    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(matchId, userId, message);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });

    socket.on('close', () => {
      this.handlePlayerDisconnect(matchId, userId);
    });

    socket.on('error', (error) => {
      console.error(`WebSocket error for player ${userId}:`, error);
      this.handlePlayerDisconnect(matchId, userId);
    });
  }

  // Handle messages from clients
  handleClientMessage(matchId, userId, message) {
    const matchState = this.matches.get(matchId);
    if (!matchState) return;

    switch (message.type) {
      case 'paddleInput':
        this.handlePaddleInput(matchState, userId, message.input);
        break;
        
      case 'ready':
        this.handlePlayerReady(matchState, userId);
        break;
        
      case 'pause':
        this.pauseMatch(matchId, userId);
        break;
        
      case 'resume':
        this.resumeMatch(matchId, userId);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  // Handle paddle input (client intentions)
  handlePaddleInput(matchState, userId, input) {
    if (matchState.status !== 'active') return;

    const playerSide = matchState.player1Id === userId ? 'left' : 'right';
    const paddle = matchState.paddles[playerSide];

    // Apply paddle movement based on input
    if (input.up && !input.down) {
      paddle.vy = -matchState.paddleSpeed;
    } else if (input.down && !input.up) {
      paddle.vy = matchState.paddleSpeed;
    } else {
      paddle.vy = 0;
    }
  }

  // Start match when both players ready
  startMatch(matchId) {
    const matchState = this.matches.get(matchId);
    if (!matchState) return;

    matchState.status = 'active';
    matchState.gameStartTime = Date.now();
    
    // Reset ball position
    this.resetBall(matchState);

    // Broadcast match start
    this.broadcastToMatch(matchId, {
      type: 'matchStarted',
      state: this.getClientGameState(matchState)
    });

    // Start game loop if not already running
    if (!this.gameLoopInterval) {
      this.startGameLoop();
    }

    console.log(`Match ${matchId} started`);
  }

  // Main game loop (server-authoritative)
  startGameLoop() {
    this.gameLoopInterval = setInterval(() => {
      this.updateAllMatches();
    }, 1000 / this.tickRate);
  }

  updateAllMatches() {
    const now = Date.now();
    
    for (const [matchId, matchState] of this.matches.entries()) {
      if (matchState.status === 'active') {
        this.updateMatchPhysics(matchState, now);
        
        // Broadcast state to clients
        this.broadcastToMatch(matchId, {
          type: 'gameUpdate',
          state: this.getClientGameState(matchState),
          serverTime: now
        });
      }
    }
  }

  // Server-side physics simulation
  updateMatchPhysics(matchState, currentTime) {
    const deltaTime = (currentTime - matchState.lastUpdate) / 1000; // Convert to seconds
    matchState.lastUpdate = currentTime;

    // Update paddle positions
    this.updatePaddles(matchState, deltaTime);
    
    // Update ball position
    this.updateBall(matchState, deltaTime);
    
    // Check collisions
    this.checkCollisions(matchState);
    
    // Check scoring
    this.checkScoring(matchState);
  }

  updatePaddles(matchState, deltaTime) {
    // Left paddle
    const leftPaddle = matchState.paddles.left;
    leftPaddle.y += leftPaddle.vy * deltaTime;
    leftPaddle.y = Math.max(0, Math.min(matchState.canvasHeight - leftPaddle.height, leftPaddle.y));

    // Right paddle
    const rightPaddle = matchState.paddles.right;
    rightPaddle.y += rightPaddle.vy * deltaTime;
    rightPaddle.y = Math.max(0, Math.min(matchState.canvasHeight - rightPaddle.height, rightPaddle.y));
  }

  updateBall(matchState, deltaTime) {
    const ball = matchState.ball;
    
    ball.x += ball.vx * deltaTime;
    ball.y += ball.vy * deltaTime;

    // Bounce off top/bottom walls
    if (ball.y <= ball.radius || ball.y >= matchState.canvasHeight - ball.radius) {
      ball.vy = -ball.vy;
      ball.y = Math.max(ball.radius, Math.min(matchState.canvasHeight - ball.radius, ball.y));
    }
  }

  checkCollisions(matchState) {
    const ball = matchState.ball;
    const leftPaddle = matchState.paddles.left;
    const rightPaddle = matchState.paddles.right;

    // Left paddle collision
    if (ball.x - ball.radius <= leftPaddle.x + leftPaddle.width &&
        ball.y >= leftPaddle.y &&
        ball.y <= leftPaddle.y + leftPaddle.height &&
        ball.vx < 0) {
      
      ball.vx = -ball.vx * 1.05; // Slight speed increase
      ball.x = leftPaddle.x + leftPaddle.width + ball.radius;
      
      // Add spin based on paddle hit position
      const hitPos = (ball.y - (leftPaddle.y + leftPaddle.height / 2)) / (leftPaddle.height / 2);
      ball.vy += hitPos * 200;
    }

    // Right paddle collision
    if (ball.x + ball.radius >= rightPaddle.x &&
        ball.y >= rightPaddle.y &&
        ball.y <= rightPaddle.y + rightPaddle.height &&
        ball.vx > 0) {
      
      ball.vx = -ball.vx * 1.05;
      ball.x = rightPaddle.x - ball.radius;
      
      const hitPos = (ball.y - (rightPaddle.y + rightPaddle.height / 2)) / (rightPaddle.height / 2);
      ball.vy += hitPos * 200;
    }

    // Limit ball speed
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (speed > matchState.ballMaxSpeed) {
      ball.vx = (ball.vx / speed) * matchState.ballMaxSpeed;
      ball.vy = (ball.vy / speed) * matchState.ballMaxSpeed;
    }
  }

  checkScoring(matchState) {
    const ball = matchState.ball;

    // Left goal (right player scores)
    if (ball.x < 0) {
      matchState.scores.right++;
      this.handleScore(matchState, 'right');
    }
    
    // Right goal (left player scores)
    if (ball.x > matchState.canvasWidth) {
      matchState.scores.left++;
      this.handleScore(matchState, 'left');
    }
  }

  handleScore(matchState, scoringSide) {
    // Broadcast score update
    this.broadcastToMatch(matchState.matchId, {
      type: 'scored',
      scoringSide,
      scores: matchState.scores
    });

    // Check for match end
    if (matchState.scores.left >= matchState.maxScore || 
        matchState.scores.right >= matchState.maxScore) {
      this.endMatch(matchState.matchId);
    } else {
      // Reset ball for next round
      setTimeout(() => {
        this.resetBall(matchState);
      }, 2000);
    }
  }

  resetBall(matchState) {
    const ball = matchState.ball;
    ball.x = matchState.canvasWidth / 2;
    ball.y = matchState.canvasHeight / 2;
    
    // Random direction
    const direction = Math.random() > 0.5 ? 1 : -1;
    ball.vx = 250 * direction;
    ball.vy = (Math.random() - 0.5) * 200;
  }

  // End match and clean up
  endMatch(matchId) {
    const matchState = this.matches.get(matchId);
    if (!matchState) return;

    matchState.status = 'finished';
    
    const winner = matchState.scores.left > matchState.scores.right ? 'left' : 'right';
    const winnerId = winner === 'left' ? matchState.player1Id : matchState.player2Id;

    // Broadcast match end
    this.broadcastToMatch(matchId, {
      type: 'matchEnded',
      winner,
      winnerId,
      finalScores: matchState.scores
    });

    // Clean up after delay
    setTimeout(() => {
      this.cleanupMatch(matchId);
    }, 10000);

    console.log(`Match ${matchId} ended, winner: ${winner}`);
  }

  // Handle player disconnect
  handlePlayerDisconnect(matchId, userId) {
    const matchState = this.matches.get(matchId);
    if (!matchState) return;

    matchState.connectedPlayers.delete(userId);
    matchState.playerSockets.delete(userId);
    this.clients.delete(userId);

    if (matchState.status === 'active') {
      // Pause match on disconnect
      matchState.status = 'paused';
      matchState.disconnectedAt = Date.now();
      matchState.pausedAt = Date.now();

      // Broadcast pause
      this.broadcastToMatch(matchId, {
        type: 'matchPaused',
        reason: 'playerDisconnected',
        timeRemaining: this.disconnectTimeout / 1000
      });

      // Set timeout to end match if player doesn't reconnect
      setTimeout(() => {
        const currentMatch = this.matches.get(matchId);
        if (currentMatch && currentMatch.status === 'paused' && 
            currentMatch.disconnectedAt === matchState.disconnectedAt) {
          this.forfeitMatch(matchId, userId);
        }
      }, this.disconnectTimeout);
    }

    console.log(`Player ${userId} disconnected from match ${matchId}`);
  }

  // Forfeit match due to timeout
  forfeitMatch(matchId, disconnectedUserId) {
    const matchState = this.matches.get(matchId);
    if (!matchState) return;

    // Award win to remaining player
    const winnerId = matchState.player1Id === disconnectedUserId ? 
      matchState.player2Id : matchState.player1Id;
    
    matchState.status = 'finished';
    
    this.broadcastToMatch(matchId, {
      type: 'matchForfeited',
      disconnectedPlayer: disconnectedUserId,
      winner: winnerId
    });

    this.cleanupMatch(matchId);
  }

  // Resume paused match
  resumeMatch(matchId, userId) {
    const matchState = this.matches.get(matchId);
    if (!matchState || matchState.status !== 'paused') return;

    if (matchState.connectedPlayers.size === 2) {
      matchState.status = 'active';
      matchState.disconnectedAt = null;
      matchState.pausedAt = null;

      this.broadcastToMatch(matchId, {
        type: 'matchResumed',
        state: this.getClientGameState(matchState)
      });
    }
  }

  // Pause match (player request)
  pauseMatch(matchId, userId) {
    const matchState = this.matches.get(matchId);
    if (!matchState || matchState.status !== 'active') return;

    matchState.status = 'paused';
    matchState.pausedAt = Date.now();

    this.broadcastToMatch(matchId, {
      type: 'matchPaused',
      reason: 'playerRequest',
      pausedBy: userId
    });
  }

  // Broadcast message to all players in match
  broadcastToMatch(matchId, message) {
    const matchState = this.matches.get(matchId);
    if (!matchState) return;

    const messageStr = JSON.stringify(message);
    
    for (const socket of matchState.playerSockets.values()) {
      if (socket.readyState === socket.OPEN) {
        socket.send(messageStr);
      }
    }
  }

  // Get game state for client (filtered)
  getClientGameState(matchState) {
    return {
      matchId: matchState.matchId,
      status: matchState.status,
      ball: { ...matchState.ball },
      paddles: {
        left: { ...matchState.paddles.left },
        right: { ...matchState.paddles.right }
      },
      scores: { ...matchState.scores },
      connectedPlayers: matchState.connectedPlayers.size,
      serverTime: Date.now()
    };
  }

  // Clean up match resources
  cleanupMatch(matchId) {
    const matchState = this.matches.get(matchId);
    if (!matchState) return;

    // Close all sockets
    for (const [userId, socket] of matchState.playerSockets.entries()) {
      this.clients.delete(userId);
      if (socket.readyState === socket.OPEN) {
        socket.close();
      }
    }

    this.matches.delete(matchId);
    console.log(`Match ${matchId} cleaned up`);

    // Stop game loop if no active matches
    if (this.matches.size === 0 && this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }
  }

  // Get active matches count
  getActiveMatchesCount() {
    let activeCount = 0;
    for (const matchState of this.matches.values()) {
      if (matchState.status === 'active' || matchState.status === 'waiting') {
        activeCount++;
      }
    }
    return activeCount;
  }
}

module.exports = new MatchHub();