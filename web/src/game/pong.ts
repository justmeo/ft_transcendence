export interface PongConfig {
  canvasWidth: number;
  canvasHeight: number;
  paddleWidth: number;
  paddleHeight: number;
  paddleSpeed: number;
  ballSize: number;
  ballSpeed: number;
  maxScore: number;
}

export interface GameState {
  leftPaddle: { x: number; y: number; dy: number };
  rightPaddle: { x: number; y: number; dy: number };
  ball: { x: number; y: number; dx: number; dy: number };
  score: { left: number; right: number };
  isRunning: boolean;
  isPaused: boolean;
}

export class PongEngine {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private config: PongConfig;
  private gameState: GameState;
  private keys: Set<string> = new Set();
  
  // Timing
  private lastTime = 0;
  private accumulator = 0;
  private readonly timestep = 1000 / 60; // 60 FPS fixed timestep
  private animationId = 0;

  constructor(config: Partial<PongConfig> = {}) {
    this.config = {
      canvasWidth: 800,
      canvasHeight: 400,
      paddleWidth: 12,
      paddleHeight: 80,
      paddleSpeed: 300, // pixels per second
      ballSize: 8,
      ballSpeed: 250,
      maxScore: 5,
      ...config
    };

    this.gameState = this.createInitialState();
  }

  private createInitialState(): GameState {
    const paddleOffset = 30;
    
    return {
      leftPaddle: {
        x: paddleOffset,
        y: this.config.canvasHeight / 2 - this.config.paddleHeight / 2,
        dy: 0
      },
      rightPaddle: {
        x: this.config.canvasWidth - paddleOffset - this.config.paddleWidth,
        y: this.config.canvasHeight / 2 - this.config.paddleHeight / 2,
        dy: 0
      },
      ball: {
        x: this.config.canvasWidth / 2,
        y: this.config.canvasHeight / 2,
        dx: Math.random() > 0.5 ? this.config.ballSpeed : -this.config.ballSpeed,
        dy: (Math.random() - 0.5) * this.config.ballSpeed * 0.5
      },
      score: { left: 0, right: 0 },
      isRunning: false,
      isPaused: false
    };
  }

  public startGame(container: HTMLElement): void {
    this.createCanvas(container);
    this.bindEvents();
    this.gameState.isRunning = true;
    this.gameLoop(0);
  }

  public stopGame(): void {
    this.gameState.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.unbindEvents();
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }

  public pauseGame(): void {
    this.gameState.isPaused = !this.gameState.isPaused;
  }

  public resetGame(): void {
    this.gameState = this.createInitialState();
    this.gameState.isRunning = true;
  }

  private createCanvas(container: HTMLElement): void {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.config.canvasWidth;
    this.canvas.height = this.config.canvasHeight;
    this.canvas.style.border = '2px solid #6366f1';
    this.canvas.style.borderRadius = '8px';
    this.canvas.style.background = 'rgba(15, 23, 42, 0.8)';
    this.canvas.style.display = 'block';
    this.canvas.style.margin = '0 auto';
    
    this.ctx = this.canvas.getContext('2d')!;
    container.appendChild(this.canvas);
  }

  private bindEvents(): void {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  private unbindEvents(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.key.toLowerCase());
    
    // Pause game with spacebar
    if (e.key === ' ') {
      e.preventDefault();
      this.pauseGame();
    }
    
    // Reset game with R
    if (e.key.toLowerCase() === 'r') {
      this.resetGame();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  private gameLoop = (currentTime: number): void => {
    if (!this.gameState.isRunning) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.accumulator += deltaTime;

    // Fixed timestep updates
    while (this.accumulator >= this.timestep) {
      if (!this.gameState.isPaused) {
        this.update(this.timestep / 1000); // Convert to seconds
      }
      this.accumulator -= this.timestep;
    }

    // Render
    this.render();
    
    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(dt: number): void {
    this.updatePaddles(dt);
    this.updateBall(dt);
    this.checkCollisions();
    this.checkScore();
  }

  private updatePaddles(dt: number): void {
    // Left paddle (W/S keys)
    this.gameState.leftPaddle.dy = 0;
    if (this.keys.has('w')) {
      this.gameState.leftPaddle.dy = -this.config.paddleSpeed;
    }
    if (this.keys.has('s')) {
      this.gameState.leftPaddle.dy = this.config.paddleSpeed;
    }

    // Right paddle (Arrow keys)
    this.gameState.rightPaddle.dy = 0;
    if (this.keys.has('arrowup')) {
      this.gameState.rightPaddle.dy = -this.config.paddleSpeed;
    }
    if (this.keys.has('arrowdown')) {
      this.gameState.rightPaddle.dy = this.config.paddleSpeed;
    }

    // Update positions
    this.gameState.leftPaddle.y += this.gameState.leftPaddle.dy * dt;
    this.gameState.rightPaddle.y += this.gameState.rightPaddle.dy * dt;

    // Clamp paddles to canvas bounds
    this.gameState.leftPaddle.y = Math.max(0, Math.min(
      this.config.canvasHeight - this.config.paddleHeight,
      this.gameState.leftPaddle.y
    ));
    
    this.gameState.rightPaddle.y = Math.max(0, Math.min(
      this.config.canvasHeight - this.config.paddleHeight,
      this.gameState.rightPaddle.y
    ));
  }

  private updateBall(dt: number): void {
    this.gameState.ball.x += this.gameState.ball.dx * dt;
    this.gameState.ball.y += this.gameState.ball.dy * dt;

    // Top/bottom wall collision
    if (this.gameState.ball.y <= this.config.ballSize / 2 || 
        this.gameState.ball.y >= this.config.canvasHeight - this.config.ballSize / 2) {
      this.gameState.ball.dy = -this.gameState.ball.dy;
      this.gameState.ball.y = Math.max(this.config.ballSize / 2, 
        Math.min(this.config.canvasHeight - this.config.ballSize / 2, this.gameState.ball.y));
    }
  }

  private checkCollisions(): void {
    const ball = this.gameState.ball;
    const ballRadius = this.config.ballSize / 2;

    // Left paddle collision
    if (ball.x - ballRadius <= this.gameState.leftPaddle.x + this.config.paddleWidth &&
        ball.x + ballRadius >= this.gameState.leftPaddle.x &&
        ball.y + ballRadius >= this.gameState.leftPaddle.y &&
        ball.y - ballRadius <= this.gameState.leftPaddle.y + this.config.paddleHeight &&
        ball.dx < 0) {
      
      ball.dx = -ball.dx;
      ball.x = this.gameState.leftPaddle.x + this.config.paddleWidth + ballRadius;
      
      // Add spin based on paddle movement
      const relativeIntersectY = (this.gameState.leftPaddle.y + this.config.paddleHeight / 2) - ball.y;
      const normalizedIntersectY = relativeIntersectY / (this.config.paddleHeight / 2);
      ball.dy = -normalizedIntersectY * this.config.ballSpeed * 0.5;
    }

    // Right paddle collision
    if (ball.x + ballRadius >= this.gameState.rightPaddle.x &&
        ball.x - ballRadius <= this.gameState.rightPaddle.x + this.config.paddleWidth &&
        ball.y + ballRadius >= this.gameState.rightPaddle.y &&
        ball.y - ballRadius <= this.gameState.rightPaddle.y + this.config.paddleHeight &&
        ball.dx > 0) {
      
      ball.dx = -ball.dx;
      ball.x = this.gameState.rightPaddle.x - ballRadius;
      
      // Add spin based on paddle movement
      const relativeIntersectY = (this.gameState.rightPaddle.y + this.config.paddleHeight / 2) - ball.y;
      const normalizedIntersectY = relativeIntersectY / (this.config.paddleHeight / 2);
      ball.dy = -normalizedIntersectY * this.config.ballSpeed * 0.5;
    }
  }

  private checkScore(): void {
    // Ball went off left side
    if (this.gameState.ball.x < 0) {
      this.gameState.score.right++;
      this.resetBall();
    }
    
    // Ball went off right side
    if (this.gameState.ball.x > this.config.canvasWidth) {
      this.gameState.score.left++;
      this.resetBall();
    }
  }

  private resetBall(): void {
    this.gameState.ball.x = this.config.canvasWidth / 2;
    this.gameState.ball.y = this.config.canvasHeight / 2;
    this.gameState.ball.dx = Math.random() > 0.5 ? this.config.ballSpeed : -this.config.ballSpeed;
    this.gameState.ball.dy = (Math.random() - 0.5) * this.config.ballSpeed * 0.5;
  }

  private render(): void {
    // Clear canvas
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.1)';
    this.ctx.fillRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);

    // Draw center line
    this.ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.config.canvasWidth / 2, 0);
    this.ctx.lineTo(this.config.canvasWidth / 2, this.config.canvasHeight);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Draw paddles
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(
      this.gameState.leftPaddle.x,
      this.gameState.leftPaddle.y,
      this.config.paddleWidth,
      this.config.paddleHeight
    );
    
    this.ctx.fillRect(
      this.gameState.rightPaddle.x,
      this.gameState.rightPaddle.y,
      this.config.paddleWidth,
      this.config.paddleHeight
    );

    // Draw ball
    this.ctx.beginPath();
    this.ctx.arc(
      this.gameState.ball.x,
      this.gameState.ball.y,
      this.config.ballSize / 2,
      0,
      Math.PI * 2
    );
    this.ctx.fill();

    // Draw score
    this.ctx.font = '48px Inter, sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      this.gameState.score.left.toString(),
      this.config.canvasWidth / 4,
      60
    );
    this.ctx.fillText(
      this.gameState.score.right.toString(),
      (this.config.canvasWidth * 3) / 4,
      60
    );

    // Draw pause indicator
    if (this.gameState.isPaused) {
      this.ctx.font = '24px Inter, sans-serif';
      this.ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
      this.ctx.fillText('PAUSED', this.config.canvasWidth / 2, this.config.canvasHeight / 2);
    }

    // Draw controls hint
    this.ctx.font = '14px Inter, sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('W/S: Left Paddle', 10, this.config.canvasHeight - 40);
    this.ctx.fillText('↑/↓: Right Paddle', 10, this.config.canvasHeight - 20);
    this.ctx.textAlign = 'right';
    this.ctx.fillText('SPACE: Pause', this.config.canvasWidth - 10, this.config.canvasHeight - 40);
    this.ctx.fillText('R: Reset', this.config.canvasWidth - 10, this.config.canvasHeight - 20);
  }

  public getGameState(): GameState {
    return { ...this.gameState };
  }

  public getConfig(): PongConfig {
    return { ...this.config };
  }
}