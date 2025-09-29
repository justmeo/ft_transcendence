export interface GameState {
  matchId: string;
  status: 'waiting' | 'active' | 'paused' | 'finished';
  ball: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
  };
  paddles: {
    left: { x: number; y: number; width: number; height: number; vy: number };
    right: { x: number; y: number; width: number; height: number; vy: number };
  };
  scores: { left: number; right: number };
  connectedPlayers: number;
  serverTime: number;
}

export interface PaddleInput {
  up: boolean;
  down: boolean;
}

export class WebSocketGameClient {
  private socket: WebSocket | null = null;
  private matchId: string;
  private userId: number;
  private playerSide: 'left' | 'right' | null = null;
  private gameState: GameState | null = null;
  private lastServerUpdate: number = 0;
  private interpolationBuffer: GameState[] = [];
  private maxBufferSize = 3;
  
  // Client-side prediction
  private clientPaddle: { y: number; vy: number } | null = null;
  private lastInputSent: number = 0;
  private inputSequence: number = 0;
  
  // Event callbacks
  private onStateUpdate: ((state: GameState) => void) | null = null;
  private onMatchEnd: ((winner: string, scores: any) => void) | null = null;
  private onError: ((error: string) => void) | null = null;
  private onConnectionChange: ((connected: boolean) => void) | null = null;

  constructor(matchId: string, userId: number) {
    this.matchId = matchId;
    this.userId = userId;
  }

  // Connect to WebSocket match
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const url = `${protocol}//${host}/api/ws/match/${this.matchId}?userId=${this.userId}&sessionId=temp`;

      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log('WebSocket connected to match:', this.matchId);
        this.onConnectionChange?.(true);
        resolve();
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleServerMessage(message);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      };

      this.socket.onclose = () => {
        console.log('WebSocket disconnected from match:', this.matchId);
        this.onConnectionChange?.(false);
        this.socket = null;
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.onError?.('Connection error');
        reject(error);
      };
    });
  }

  // Handle messages from server
  private handleServerMessage(message: any): void {
    switch (message.type) {
      case 'matchJoined':
        this.playerSide = message.playerSide;
        this.gameState = message.state;
        this.initializeClientPrediction();
        if (this.gameState) this.onStateUpdate?.(this.gameState);
        break;

      case 'matchStarted':
        this.gameState = message.state;
        if (this.gameState) this.onStateUpdate?.(this.gameState);
        break;

      case 'gameUpdate':
        this.handleGameUpdate(message.state, message.serverTime);
        break;

      case 'scored':
        if (this.gameState) {
          this.gameState.scores = message.scores;
          this.onStateUpdate?.(this.gameState);
        }
        break;

      case 'matchEnded':
        this.onMatchEnd?.(message.winner, message.finalScores);
        break;

      case 'matchPaused':
        if (this.gameState) {
          this.gameState.status = 'paused';
          this.onStateUpdate?.(this.gameState);
        }
        break;

      case 'matchResumed':
        this.gameState = message.state;
        if (this.gameState) this.onStateUpdate?.(this.gameState);
        break;

      case 'matchForfeited':
        this.onMatchEnd?.(message.winner, null);
        break;

      case 'error':
        this.onError?.(message.message);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  // Handle game state updates with interpolation
  private handleGameUpdate(serverState: GameState, serverTime: number): void {
    this.lastServerUpdate = Date.now();
    
    // Add to interpolation buffer
    this.interpolationBuffer.push({
      ...serverState,
      serverTime
    });

    // Keep buffer size manageable
    if (this.interpolationBuffer.length > this.maxBufferSize) {
      this.interpolationBuffer.shift();
    }

    // Server reconciliation for our paddle
    if (this.playerSide && this.clientPaddle) {
      const serverPaddle = serverState.paddles[this.playerSide];
      const errorThreshold = 5; // pixels
      
      const error = Math.abs(this.clientPaddle.y - serverPaddle.y);
      if (error > errorThreshold) {
        // Server correction - smooth reconciliation
        this.clientPaddle.y = this.lerp(this.clientPaddle.y, serverPaddle.y, 0.3);
      }
    }

    this.gameState = this.getInterpolatedState();
    if (this.gameState) this.onStateUpdate?.(this.gameState);
  }

  // Initialize client-side prediction
  private initializeClientPrediction(): void {
    if (this.playerSide && this.gameState) {
      const paddle = this.gameState.paddles[this.playerSide];
      this.clientPaddle = {
        y: paddle.y,
        vy: paddle.vy
      };
    }
  }

  // Get interpolated game state
  private getInterpolatedState(): GameState | null {
    if (!this.gameState || this.interpolationBuffer.length === 0) {
      return this.gameState;
    }

    const now = Date.now();
    const renderTime = now - 100; // Render 100ms in the past for smooth interpolation

    // Find the two states to interpolate between
    let state1 = this.interpolationBuffer[0];
    let state2 = this.interpolationBuffer[0];

    for (let i = 0; i < this.interpolationBuffer.length - 1; i++) {
      if (this.interpolationBuffer[i].serverTime <= renderTime && 
          this.interpolationBuffer[i + 1].serverTime >= renderTime) {
        state1 = this.interpolationBuffer[i];
        state2 = this.interpolationBuffer[i + 1];
        break;
      }
    }

    // Interpolate between states
    if (state1 === state2) {
      return state1;
    }

    const timeDiff = state2.serverTime - state1.serverTime;
    const timeAlpha = timeDiff > 0 ? (renderTime - state1.serverTime) / timeDiff : 0;
    const alpha = Math.max(0, Math.min(1, timeAlpha));

    // Create interpolated state
    const interpolatedState: GameState = {
      ...state2,
      ball: {
        ...state2.ball,
        x: this.lerp(state1.ball.x, state2.ball.x, alpha),
        y: this.lerp(state1.ball.y, state2.ball.y, alpha)
      },
      paddles: {
        left: {
          ...state2.paddles.left,
          y: this.lerp(state1.paddles.left.y, state2.paddles.left.y, alpha)
        },
        right: {
          ...state2.paddles.right,
          y: this.lerp(state1.paddles.right.y, state2.paddles.right.y, alpha)
        }
      }
    };

    // Use client prediction for our paddle
    if (this.playerSide && this.clientPaddle) {
      interpolatedState.paddles[this.playerSide].y = this.clientPaddle.y;
    }

    return interpolatedState;
  }

  // Send paddle input to server
  sendPaddleInput(input: PaddleInput): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const now = Date.now();
    
    // Throttle input to avoid spam
    if (now - this.lastInputSent < 16) { // ~60 FPS
      return;
    }

    this.lastInputSent = now;
    this.inputSequence++;

    // Client-side prediction
    this.predictPaddleMovement(input);

    // Send to server
    this.socket.send(JSON.stringify({
      type: 'paddleInput',
      input,
      sequence: this.inputSequence,
      timestamp: now
    }));
  }

  // Client-side paddle prediction
  private predictPaddleMovement(input: PaddleInput): void {
    if (!this.clientPaddle || !this.gameState) return;

    const deltaTime = 1/60; // Assume 60 FPS
    const paddleSpeed = 400;

    // Update velocity based on input
    if (input.up && !input.down) {
      this.clientPaddle.vy = -paddleSpeed;
    } else if (input.down && !input.up) {
      this.clientPaddle.vy = paddleSpeed;
    } else {
      this.clientPaddle.vy = 0;
    }

    // Update position
    this.clientPaddle.y += this.clientPaddle.vy * deltaTime;
    
    // Clamp to screen bounds
    const paddleHeight = this.gameState.paddles[this.playerSide!].height;
    this.clientPaddle.y = Math.max(0, Math.min(400 - paddleHeight, this.clientPaddle.y));
  }

  // Send ready signal
  sendReady(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'ready' }));
    }
  }

  // Request pause
  requestPause(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'pause' }));
    }
  }

  // Request resume
  requestResume(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'resume' }));
    }
  }

  // Disconnect from match
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // Utility functions
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  // Event handlers
  onGameStateUpdate(callback: (state: GameState) => void): void {
    this.onStateUpdate = callback;
  }

  onGameEnd(callback: (winner: string, scores: any) => void): void {
    this.onMatchEnd = callback;
  }

  onGameError(callback: (error: string) => void): void {
    this.onError = callback;
  }

  onConnectionStatusChange(callback: (connected: boolean) => void): void {
    this.onConnectionChange = callback;
  }

  // Getters
  getPlayerSide(): 'left' | 'right' | null {
    return this.playerSide;
  }

  getCurrentState(): GameState | null {
    return this.gameState;
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}