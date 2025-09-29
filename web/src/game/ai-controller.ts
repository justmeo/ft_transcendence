export interface GameState {
  ball: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
  };
  paddles: {
    left: { x: number; y: number; width: number; height: number };
    right: { x: number; y: number; width: number; height: number };
  };
  canvasWidth: number;
  canvasHeight: number;
}

export interface PaddleIntent {
  up: boolean;
  down: boolean;
  idle: boolean;
}

export class AIController {
  private lastSampleTime: number = 0;
  private sampleRate: number = 1000; // 1Hz = 1000ms
  private currentIntent: PaddleIntent = { up: false, down: false, idle: true };
  private targetY: number = 200; // Target paddle center position
  private reactionDelay: number = 150; // AI reaction time in ms
  private difficulty: number = 0.7; // 0.0 to 1.0, affects precision and reaction
  private lastBallDirection: number = 0; // Track ball direction changes
  private predictedImpactY: number = 200; // Where AI thinks ball will hit
  
  // AI behavioral parameters
  private maxPaddleSpeed: number = 400; // Match player speed limit
  private predictionAccuracy: number = 0.85; // How accurate ball prediction is
  private trackingSmoothing: number = 0.3; // How smoothly AI follows target
  private anticipationFactor: number = 0.6; // How much AI anticipates vs reacts
  
  constructor(difficulty: number = 0.7) {
    this.difficulty = Math.max(0.1, Math.min(1.0, difficulty));
    this.updateDifficultyParameters();
  }

  // Update AI parameters based on difficulty
  private updateDifficultyParameters(): void {
    // Easy AI (0.1-0.4): Slow reaction, poor prediction
    // Medium AI (0.4-0.7): Balanced
    // Hard AI (0.7-1.0): Fast reaction, good prediction
    
    this.reactionDelay = 300 - (this.difficulty * 200); // 300ms to 100ms
    this.predictionAccuracy = 0.5 + (this.difficulty * 0.4); // 50% to 90%
    this.trackingSmoothing = 0.1 + (this.difficulty * 0.3); // Smoother tracking at higher difficulty
    this.anticipationFactor = 0.2 + (this.difficulty * 0.6); // More anticipation at higher difficulty
  }

  // Main AI update method - call this every frame
  update(gameState: GameState, aiSide: 'left' | 'right', deltaTime: number): PaddleIntent {
    const currentTime = Date.now();
    
    // Sample game state at 1Hz
    if (currentTime - this.lastSampleTime >= this.sampleRate) {
      this.analyzeGameState(gameState, aiSide);
      this.lastSampleTime = currentTime;
    }
    
    // Update paddle movement based on current intent
    this.updatePaddleMovement(gameState, aiSide, deltaTime);
    
    return this.currentIntent;
  }

  // Analyze game state and make decisions
  private analyzeGameState(gameState: GameState, aiSide: 'left' | 'right'): void {
    const { ball, paddles, canvasWidth, canvasHeight } = gameState;
    const aiPaddle = paddles[aiSide];
    const aiPaddleCenter = aiPaddle.y + aiPaddle.height / 2;
    
    // Check if ball is moving toward AI paddle
    const ballMovingTowardAI = (aiSide === 'left' && ball.vx < 0) || 
                               (aiSide === 'right' && ball.vx > 0);
    
    if (ballMovingTowardAI) {
      // Predict where ball will intersect with AI paddle
      this.predictedImpactY = this.predictBallTrajectory(gameState, aiSide);
      
      // Add some error based on difficulty
      if (this.predictionAccuracy < 1.0) {
        const error = (1.0 - this.predictionAccuracy) * 100; // Max 50px error
        const randomError = (Math.random() - 0.5) * error * 2;
        this.predictedImpactY += randomError;
      }
      
      // Set target to predicted impact point
      this.targetY = this.predictedImpactY;
    } else {
      // Ball moving away - return to center with some strategy
      this.returnToDefensivePosition(gameState, aiSide);
    }
    
    // Clamp target to valid paddle positions
    this.targetY = Math.max(aiPaddle.height / 2, 
                   Math.min(canvasHeight - aiPaddle.height / 2, this.targetY));
  }

  // Predict ball trajectory with wall bounces
  private predictBallTrajectory(gameState: GameState, aiSide: 'left' | 'right'): number {
    const { ball, canvasWidth, canvasHeight } = gameState;
    
    // Simulate ball movement until it reaches AI paddle
    let simBallX = ball.x;
    let simBallY = ball.y;
    let simVX = ball.vx;
    let simVY = ball.vy;
    
    const targetX = aiSide === 'left' ? 40 : canvasWidth - 40; // Paddle X position
    const maxIterations = 100; // Prevent infinite loops
    let iterations = 0;
    
    while (iterations < maxIterations) {
      // Calculate time to reach target X
      const timeToTarget = Math.abs((targetX - simBallX) / simVX);
      
      if (timeToTarget <= 0) break;
      
      // Move ball for this time step
      const nextX = simBallX + simVX * timeToTarget;
      const nextY = simBallY + simVY * timeToTarget;
      
      // Check for wall bounces during this movement
      let bounced = false;
      let timeUsed = 0;
      
      while (timeUsed < timeToTarget && !bounced) {
        const remainingTime = timeToTarget - timeUsed;
        
        // Time to hit top wall
        const timeToTop = simVY < 0 ? (ball.radius - simBallY) / simVY : Infinity;
        // Time to hit bottom wall  
        const timeToBottom = simVY > 0 ? (canvasHeight - ball.radius - simBallY) / simVY : Infinity;
        
        const timeToWall = Math.min(Math.abs(timeToTop), Math.abs(timeToBottom));
        
        if (timeToWall < remainingTime) {
          // Ball will hit wall before reaching target
          simBallX += simVX * timeToWall;
          simBallY += simVY * timeToWall;
          simVY = -simVY; // Bounce off wall
          timeUsed += timeToWall;
          bounced = true;
        } else {
          // Ball reaches target X without hitting wall
          simBallX = nextX;
          simBallY = nextY;
          break;
        }
      }
      
      // If ball reached target X, return the Y position
      if (Math.abs(simBallX - targetX) <= Math.abs(simVX * 0.016)) { // ~1 frame tolerance
        return simBallY;
      }
      
      iterations++;
    }
    
    // Fallback: return current ball Y
    return ball.y;
  }

  // Return to defensive position when ball is moving away
  private returnToDefensivePosition(gameState: GameState, aiSide: 'left' | 'right'): void {
    const { ball, canvasHeight } = gameState;
    
    // Defensive position is slightly biased toward ball Y but centered
    const centerY = canvasHeight / 2;
    const ballBias = (ball.y - centerY) * this.anticipationFactor;
    this.targetY = centerY + ballBias;
  }

  // Update paddle movement based on target position
  private updatePaddleMovement(gameState: GameState, aiSide: 'left' | 'right', deltaTime: number): void {
    const aiPaddle = gameState.paddles[aiSide];
    const currentPaddleCenter = aiPaddle.y + aiPaddle.height / 2;
    
    // Calculate difference between current and target position
    const diff = this.targetY - currentPaddleCenter;
    const absDiff = Math.abs(diff);
    
    // Dead zone - don't move if close enough
    const deadZone = 5; // pixels
    if (absDiff < deadZone) {
      this.currentIntent = { up: false, down: false, idle: true };
      return;
    }
    
    // Calculate desired movement speed
    const maxMoveDistance = this.maxPaddleSpeed * (deltaTime / 1000);
    const moveDistance = Math.min(absDiff, maxMoveDistance);
    
    // Apply smoothing to movement
    const smoothedDiff = diff * this.trackingSmoothing;
    const needsMovement = Math.abs(smoothedDiff) > deadZone;
    
    if (needsMovement) {
      if (smoothedDiff > 0) {
        // Move down
        this.currentIntent = { up: false, down: true, idle: false };
      } else {
        // Move up  
        this.currentIntent = { up: true, down: false, idle: false };
      }
    } else {
      // Stay idle
      this.currentIntent = { up: false, down: false, idle: true };
    }
    
    // Add some randomness to make AI less perfect
    if (Math.random() > this.difficulty) {
      // Occasionally make wrong decision
      if (!this.currentIntent.idle && Math.random() < 0.1) {
        this.currentIntent = { 
          up: this.currentIntent.down, 
          down: this.currentIntent.up, 
          idle: false 
        };
      }
    }
  }

  // Get current AI intent (for external systems)
  getCurrentIntent(): PaddleIntent {
    return { ...this.currentIntent };
  }

  // Reset AI state (useful when starting new game)
  reset(): void {
    this.currentIntent = { up: false, down: false, idle: true };
    this.targetY = 200;
    this.lastSampleTime = 0;
    this.predictedImpactY = 200;
  }

  // Update difficulty during game
  setDifficulty(difficulty: number): void {
    this.difficulty = Math.max(0.1, Math.min(1.0, difficulty));
    this.updateDifficultyParameters();
  }

  // Get AI statistics for debugging
  getDebugInfo(): any {
    return {
      difficulty: this.difficulty,
      currentIntent: this.currentIntent,
      targetY: this.targetY,
      predictedImpactY: this.predictedImpactY,
      reactionDelay: this.reactionDelay,
      predictionAccuracy: this.predictionAccuracy
    };
  }

  // Static method to create AI with different difficulty presets
  static createEasyAI(): AIController {
    return new AIController(0.3);
  }

  static createMediumAI(): AIController {
    return new AIController(0.6);
  }

  static createHardAI(): AIController {
    return new AIController(0.9);
  }

  // Method to simulate human-like inconsistency
  private addHumanLikeError(): void {
    // Occasionally "miss" the ball due to over-anticipation
    if (Math.random() < (1.0 - this.difficulty) * 0.1) {
      this.targetY += (Math.random() - 0.5) * 50;
    }
    
    // Sometimes react late to direction changes
    if (Math.random() < (1.0 - this.difficulty) * 0.05) {
      // Delay next decision
      this.lastSampleTime += this.reactionDelay;
    }
  }
}