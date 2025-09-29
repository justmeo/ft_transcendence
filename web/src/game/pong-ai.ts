import { AIController, PaddleIntent } from './ai-controller';

export interface PongConfig {
  ballSpeed?: number;
  paddleHeight?: number;
  paddleSpeed?: number;
  canvasId?: string;
  enableAI?: boolean;
  aiDifficulty?: number;
  aiSide?: 'left' | 'right';
}

export class EnhancedPongEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private aiController: AIController | null = null;
  private aiEnabled: boolean = false;
  private aiSide: 'left' | 'right' = 'right';

  // Game state
  private ball = {
    x: 400,
    y: 200,
    vx: 250,
    vy: 150,
    radius: 8,
    speed: 250
  };

  private paddles = {
    left: { x: 20, y: 160, width: 20, height: 80, vy: 0 },
    right: { x: 760, y: 160, width: 20, height: 80, vy: 0 }
  };

  private scores = { left: 0, right: 0 };
  private maxScore = 5;
  private paddleSpeed = 400;
  
  // Input tracking
  private keys: { [key: string]: boolean } = {};
  
  // Game callbacks
  private onGameEnd: ((winner: 'left' | 'right') => void) | null = null;

  constructor(config: PongConfig = {}) {
    // Get canvas
    const canvasId = config.canvasId || 'pong-canvas';
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    
    if (!this.canvas) {
      throw new Error(`Canvas with id '${canvasId}' not found`);
    }

    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = context;

    // Apply configuration
    this.ball.speed = config.ballSpeed || 250;
    this.paddles.left.height = config.paddleHeight || 80;
    this.paddles.right.height = config.paddleHeight || 80;
    this.paddleSpeed = config.paddleSpeed || 400;

    // Initialize AI if enabled
    if (config.enableAI) {
      this.aiEnabled = true;
      this.aiSide = config.aiSide || 'right';
      this.aiController = new AIController(config.aiDifficulty || 0.6);
    }

    // Set up canvas
    this.setupCanvas();
    
    // Set up controls
    this.setupControls();
  }

  private setupCanvas(): void {
    this.canvas.width = 800;
    this.canvas.height = 400;
    
    // Canvas styling
    this.canvas.style.border = '2px solid #6366f1';
    this.canvas.style.borderRadius = '8px';
    this.canvas.style.background = '#000';
  }

  private setupControls(): void {
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  public startGame(): void {
    this.resetGame();
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  public stopGame(): void {
    this.isRunning = false;
  }

  public resetGame(): void {
    this.ball.x = this.canvas.width / 2;
    this.ball.y = this.canvas.height / 2;
    this.ball.vx = (Math.random() > 0.5 ? 1 : -1) * this.ball.speed;
    this.ball.vy = (Math.random() - 0.5) * this.ball.speed * 0.7;
    
    this.paddles.left.y = (this.canvas.height - this.paddles.left.height) / 2;
    this.paddles.right.y = (this.canvas.height - this.paddles.right.height) / 2;
    
    this.scores = { left: 0, right: 0 };
    
    if (this.aiController) {
      this.aiController.reset();
    }
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    const dt = deltaTime / 1000; // Convert to seconds

    // Update paddle movements
    this.updatePaddles(dt);
    
    // Update AI
    if (this.aiEnabled && this.aiController) {
      const gameState = {
        ball: { ...this.ball },
        paddles: {
          left: { ...this.paddles.left },
          right: { ...this.paddles.right }
        },
        canvasWidth: this.canvas.width,
        canvasHeight: this.canvas.height
      };
      
      const aiIntent = this.aiController.update(gameState, this.aiSide, deltaTime);
      this.applyAIInput(aiIntent, dt);
    }
    
    // Update ball
    this.updateBall(dt);
    
    // Check collisions
    this.checkCollisions();
    
    // Check scoring
    this.checkScoring();
  }

  private updatePaddles(deltaTime: number): void {
    // Human player controls (non-AI side)
    if (!this.aiEnabled || this.aiSide === 'right') {
      // Left paddle (human)
      const leftPaddle = this.paddles.left;
      if (this.keys['w'] || this.keys['arrowup']) {
        leftPaddle.vy = -this.paddleSpeed;
      } else if (this.keys['s'] || this.keys['arrowdown']) {
        leftPaddle.vy = this.paddleSpeed;
      } else {
        leftPaddle.vy = 0;
      }
      
      leftPaddle.y += leftPaddle.vy * deltaTime;
      leftPaddle.y = Math.max(0, Math.min(this.canvas.height - leftPaddle.height, leftPaddle.y));
    }

    if (!this.aiEnabled || this.aiSide === 'left') {
      // Right paddle (human or second player)
      const rightPaddle = this.paddles.right;
      if (this.keys['arrowup'] || this.keys['i']) {
        rightPaddle.vy = -this.paddleSpeed;
      } else if (this.keys['arrowdown'] || this.keys['k']) {
        rightPaddle.vy = this.paddleSpeed;
      } else {
        rightPaddle.vy = 0;
      }
      
      rightPaddle.y += rightPaddle.vy * deltaTime;
      rightPaddle.y = Math.max(0, Math.min(this.canvas.height - rightPaddle.height, rightPaddle.y));
    }
  }

  private applyAIInput(intent: PaddleIntent, deltaTime: number): void {
    const aiPaddle = this.paddles[this.aiSide];
    
    if (intent.up) {
      aiPaddle.vy = -this.paddleSpeed;
    } else if (intent.down) {
      aiPaddle.vy = this.paddleSpeed;
    } else {
      aiPaddle.vy = 0;
    }
    
    // Update AI paddle position
    aiPaddle.y += aiPaddle.vy * deltaTime;
    aiPaddle.y = Math.max(0, Math.min(this.canvas.height - aiPaddle.height, aiPaddle.y));
  }

  private updateBall(deltaTime: number): void {
    this.ball.x += this.ball.vx * deltaTime;
    this.ball.y += this.ball.vy * deltaTime;

    // Bounce off top/bottom walls
    if (this.ball.y <= this.ball.radius || this.ball.y >= this.canvas.height - this.ball.radius) {
      this.ball.vy = -this.ball.vy;
      this.ball.y = Math.max(this.ball.radius, Math.min(this.canvas.height - this.ball.radius, this.ball.y));
    }
  }

  private checkCollisions(): void {
    const ball = this.ball;
    const leftPaddle = this.paddles.left;
    const rightPaddle = this.paddles.right;

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
    const maxSpeed = 500;
    if (speed > maxSpeed) {
      ball.vx = (ball.vx / speed) * maxSpeed;
      ball.vy = (ball.vy / speed) * maxSpeed;
    }
  }

  private checkScoring(): void {
    // Left goal (right player scores)
    if (this.ball.x < 0) {
      this.scores.right++;
      this.resetBall();
      this.checkGameEnd();
    }
    
    // Right goal (left player scores)
    if (this.ball.x > this.canvas.width) {
      this.scores.left++;
      this.resetBall();
      this.checkGameEnd();
    }
  }

  private resetBall(): void {
    this.ball.x = this.canvas.width / 2;
    this.ball.y = this.canvas.height / 2;
    
    // Random direction
    const direction = Math.random() > 0.5 ? 1 : -1;
    this.ball.vx = direction * this.ball.speed;
    this.ball.vy = (Math.random() - 0.5) * this.ball.speed * 0.7;
  }

  private checkGameEnd(): void {
    if (this.scores.left >= this.maxScore) {
      this.isRunning = false;
      this.onGameEnd?.('left');
    } else if (this.scores.right >= this.maxScore) {
      this.isRunning = false;
      this.onGameEnd?.('right');
    }
  }

  private render(): void {
    // Clear canvas
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw paddles
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(this.paddles.left.x, this.paddles.left.y, this.paddles.left.width, this.paddles.left.height);
    this.ctx.fillRect(this.paddles.right.x, this.paddles.right.y, this.paddles.right.width, this.paddles.right.height);

    // Draw ball
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw scores
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.scores.left.toString(), this.canvas.width / 4, 60);
    this.ctx.fillText(this.scores.right.toString(), (this.canvas.width * 3) / 4, 60);

    // Draw center line
    this.ctx.setLineDash([5, 15]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width / 2, 0);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Draw AI indicator
    if (this.aiEnabled && this.aiController) {
      const aiSideText = this.aiSide === 'left' ? 'AI' : 'AI';
      this.ctx.font = '16px Arial';
      this.ctx.fillStyle = '#6366f1';
      
      if (this.aiSide === 'left') {
        this.ctx.textAlign = 'left';
        this.ctx.fillText('🤖 AI', 10, 30);
      } else {
        this.ctx.textAlign = 'right';
        this.ctx.fillText('AI 🤖', this.canvas.width - 10, 30);
      }
      
      // Debug info (optional)
      if (false && this.aiController) { // Set to true for debugging
        const debugInfo = this.aiController.getDebugInfo();
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#666';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Target: ${Math.round(debugInfo.targetY)}`, 10, this.canvas.height - 60);
        this.ctx.fillText(`Predicted: ${Math.round(debugInfo.predictedImpactY)}`, 10, this.canvas.height - 45);
        this.ctx.fillText(`Difficulty: ${debugInfo.difficulty.toFixed(1)}`, 10, this.canvas.height - 30);
        this.ctx.fillText(`Intent: ${JSON.stringify(debugInfo.currentIntent)}`, 10, this.canvas.height - 15);
      }
    }
  }

  // Public methods
  public setGameEndCallback(callback: (winner: 'left' | 'right') => void): void {
    this.onGameEnd = callback;
  }

  public getScores(): { left: number; right: number } {
    return { ...this.scores };
  }

  public isGameRunning(): boolean {
    return this.isRunning;
  }

  public setAIDifficulty(difficulty: number): void {
    if (this.aiController) {
      this.aiController.setDifficulty(difficulty);
    }
  }

  public toggleAI(): void {
    if (!this.aiController) {
      this.aiController = new AIController(0.6);
      this.aiEnabled = true;
    } else {
      this.aiEnabled = !this.aiEnabled;
      if (this.aiEnabled) {
        this.aiController.reset();
      }
    }
  }
}