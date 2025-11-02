export interface PongConfig {
  canvasWidth: number;
  canvasHeight: number;
  paddleWidth: number;
  paddleHeight: number;
  paddleSpeed: number;
  ballRadius: number;
  ballSpeed: number;
  maxScore: number;
}

export interface PongOptions extends Partial<PongConfig> {
  canvas?: HTMLCanvasElement;
}

export interface GameState {
  leftPaddle: { x: number; y: number; dy: number };
  rightPaddle: { x: number; y: number; dy: number };
  ball: { x: number; y: number; dx: number; dy: number };
  score: { left: number; right: number };
  isRunning: boolean;
  isPaused: boolean;
}

type GameEndHandler = (winner: 'left' | 'right', finalScore: { left: number; right: number }) => void;
type ScoreHandler = (score: { left: number; right: number }) => void;

export class PongEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private config: PongConfig;
  private gameState: GameState;
  private readonly keys: Set<string> = new Set();

  // Timing
  private lastTime = 0;
  private accumulator = 0;
  private readonly timestep = 1000 / 60; // 60 FPS fixed timestep
  private animationId = 0;
  private eventsBound = false;

  // Physics
  private readonly maxBounceAngle = Math.PI * 0.33; // ~60 degrees
  private readonly spinInfluence = 0.25;
  private readonly speedIncrement = 22;
  private readonly maxSpeedMultiplier = 1.9;
  private baseBallSpeed: number;
  private currentBallSpeed: number;

  private onGameEnd: GameEndHandler | null = null;
  private onScoreChange: ScoreHandler | null = null;
  private canvasOwned = false;

  constructor(options: PongOptions = {}) {
    const {
      canvas,
      ...partialConfig
    } = options;

    this.config = {
      canvasWidth: 800,
      canvasHeight: 400,
      paddleWidth: 16,
      paddleHeight: 88,
      paddleSpeed: 360,
      ballRadius: 10,
      ballSpeed: 260,
      maxScore: 5,
      ...partialConfig
    };

    this.baseBallSpeed = this.config.ballSpeed;
    this.currentBallSpeed = this.config.ballSpeed;

    this.gameState = this.createInitialState();

    if (canvas) {
      this.attachCanvas(canvas);
    }
  }

  private createInitialState(): GameState {
    const paddleOffset = 40;

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
        dx: 0,
        dy: 0
      },
      score: { left: 0, right: 0 },
      isRunning: false,
      isPaused: false
    };
  }

  private attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.canvas.width = this.config.canvasWidth;
    this.canvas.height = this.config.canvasHeight;
    this.canvas.style.border = '2px solid rgba(99, 102, 241, 0.6)';
    this.canvas.style.borderRadius = '14px';
    this.canvas.style.background = '#050505';
    this.canvas.style.display = 'block';
    this.canvas.style.margin = '0 auto';
    this.canvas.style.boxShadow = '0 18px 35px rgba(0, 0, 0, 0.35)';

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      throw new Error('Unable to acquire rendering context for Pong canvas');
    }
  }

  private ensureCanvas(container?: HTMLElement): void {
    if (this.canvas) {
      if (container && this.canvas.parentElement !== container) {
        container.innerHTML = '';
        container.appendChild(this.canvas);
      }
      return;
    }

    if (!container) {
      throw new Error('No canvas provided for PongEngine and no container to create one.');
    }

    const canvas = document.createElement('canvas');
    this.canvasOwned = true;
    container.innerHTML = '';
    container.appendChild(canvas);
    this.attachCanvas(canvas);
  }

  private bindEvents(): void {
    if (this.eventsBound) return;
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    this.eventsBound = true;
  }

  private unbindEvents(): void {
    if (!this.eventsBound) return;
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.eventsBound = false;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.key.toLowerCase());

    // Pause game with spacebar
    if (e.key === ' ') {
      e.preventDefault();
      this.togglePause();
    }

    // Reset game with R
    if (e.key.toLowerCase() === 'r') {
      this.restartMatch();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  public startGame(container?: HTMLElement): void {
    this.ensureCanvas(container);
    if (!this.canvas || !this.ctx) return;

    if (!this.gameState.isRunning) {
      this.bindEvents();
      this.gameState.isRunning = true;
      this.gameState.isPaused = false;
      this.currentBallSpeed = this.baseBallSpeed;
      this.launchBall();
      this.lastTime = performance.now();
      this.accumulator = 0;
      this.animationId = requestAnimationFrame(this.gameLoop);
    } else if (this.gameState.isPaused) {
      this.togglePause(false);
    }
  }

  public restartMatch(): void {
    this.resetGame(false);
  }

  public stopGame(removeCanvas = false): void {
    this.gameState.isRunning = false;
    this.gameState.isPaused = false;
    cancelAnimationFrame(this.animationId);
    this.unbindEvents();

    if (removeCanvas && this.canvas && this.canvasOwned) {
      this.canvas.remove();
      this.canvas = null;
      this.ctx = null;
      this.canvasOwned = false;
    }
  }

  public destroy(): void {
    this.stopGame(true);
  }

  public togglePause(forceState?: boolean): void {
    if (!this.gameState.isRunning) {
      return;
    }

    if (typeof forceState === 'boolean') {
      this.gameState.isPaused = !forceState ? false : true;
    } else {
      this.gameState.isPaused = !this.gameState.isPaused;
    }

    if (this.gameState.isPaused) {
      cancelAnimationFrame(this.animationId);
    } else {
      this.lastTime = performance.now();
      this.animationId = requestAnimationFrame(this.gameLoop);
    }
  }

  public updateConfig(partial: Partial<PongConfig>): void {
    let previousPaddleHeight = this.config.paddleHeight;
    let paddleUpdated = false;
    let ballSpeedUpdated = false;

    if (typeof partial.paddleHeight === 'number' && partial.paddleHeight > 20) {
      previousPaddleHeight = this.config.paddleHeight;
      this.config.paddleHeight = partial.paddleHeight;
      paddleUpdated = true;
    }

    if (typeof partial.ballSpeed === 'number' && partial.ballSpeed > 60) {
      this.config.ballSpeed = partial.ballSpeed;
      this.baseBallSpeed = partial.ballSpeed;
      this.currentBallSpeed = Math.min(this.currentBallSpeed, this.baseBallSpeed * this.maxSpeedMultiplier);
      ballSpeedUpdated = true;
    }

    if (paddleUpdated) {
      this.adjustPaddlesAfterHeightChange(previousPaddleHeight);
    }

    if (ballSpeedUpdated && !this.gameState.isRunning) {
      this.gameState.ball.dx = 0;
      this.gameState.ball.dy = 0;
    }
  }

  private adjustPaddlesAfterHeightChange(previousHeight: number): void {
    const clamp = (y: number) => Math.max(
      0,
      Math.min(this.config.canvasHeight - this.config.paddleHeight, y)
    );

    const leftCenter = this.gameState.leftPaddle.y + previousHeight / 2;
    const rightCenter = this.gameState.rightPaddle.y + previousHeight / 2;

    this.gameState.leftPaddle.y = clamp(leftCenter - this.config.paddleHeight / 2);
    this.gameState.rightPaddle.y = clamp(rightCenter - this.config.paddleHeight / 2);
  }

  private resetGame(preserveScore: boolean): void {
    this.gameState.leftPaddle.y = this.config.canvasHeight / 2 - this.config.paddleHeight / 2;
    this.gameState.rightPaddle.y = this.config.canvasHeight / 2 - this.config.paddleHeight / 2;
    this.gameState.leftPaddle.dy = 0;
    this.gameState.rightPaddle.dy = 0;
    this.gameState.ball.x = this.config.canvasWidth / 2;
    this.gameState.ball.y = this.config.canvasHeight / 2;
    this.gameState.ball.dx = 0;
    this.gameState.ball.dy = 0;
    this.currentBallSpeed = this.baseBallSpeed;
    this.gameState.isPaused = false;

    if (!preserveScore) {
      this.gameState.score.left = 0;
      this.gameState.score.right = 0;
      this.onScoreChange?.({ ...this.gameState.score });
    }

    if (this.gameState.isRunning) {
      this.launchBall();
    }
  }

  private launchBall(direction?: number): void {
    const dir = direction ?? (Math.random() > 0.5 ? 1 : -1);
    const angle = (Math.random() - 0.5) * this.maxBounceAngle * 0.6; // avoid extreme vertical starts

    this.currentBallSpeed = this.baseBallSpeed;
    this.gameState.ball.dx = Math.cos(angle) * this.currentBallSpeed * dir;
    this.gameState.ball.dy = -Math.sin(angle) * this.currentBallSpeed;
  }

  private gameLoop = (currentTime: number): void => {
    if (!this.gameState.isRunning || this.gameState.isPaused) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.accumulator += deltaTime;

    while (this.accumulator >= this.timestep) {
      this.update(this.timestep / 1000);
      this.accumulator -= this.timestep;
    }

    this.render();
    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(dt: number): void {
    this.updatePaddles(dt);
    this.updateBall(dt);
    this.handleCollisions();
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

    // Right paddle (Arrow keys or I/K)
    this.gameState.rightPaddle.dy = 0;
    if (this.keys.has('arrowup') || this.keys.has('i')) {
      this.gameState.rightPaddle.dy = -this.config.paddleSpeed;
    }
    if (this.keys.has('arrowdown') || this.keys.has('k')) {
      this.gameState.rightPaddle.dy = this.config.paddleSpeed;
    }

    this.gameState.leftPaddle.y += this.gameState.leftPaddle.dy * dt;
    this.gameState.rightPaddle.y += this.gameState.rightPaddle.dy * dt;

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

    const topLimit = this.config.ballRadius;
    const bottomLimit = this.config.canvasHeight - this.config.ballRadius;

    if (this.gameState.ball.y <= topLimit) {
      this.gameState.ball.y = topLimit;
      this.gameState.ball.dy = Math.abs(this.gameState.ball.dy);
    } else if (this.gameState.ball.y >= bottomLimit) {
      this.gameState.ball.y = bottomLimit;
      this.gameState.ball.dy = -Math.abs(this.gameState.ball.dy);
    }
  }

  private handleCollisions(): void {
    const ball = this.gameState.ball;
    const radius = this.config.ballRadius;

    this.checkPaddleCollision(this.gameState.leftPaddle, true);
    this.checkPaddleCollision(this.gameState.rightPaddle, false);
  }

  private checkPaddleCollision(
    paddle: GameState['leftPaddle'],
    isLeft: boolean
  ): boolean {
    const ball = this.gameState.ball;
    const radius = this.config.ballRadius;
    const paddleRight = paddle.x + this.config.paddleWidth;
    const paddleBottom = paddle.y + this.config.paddleHeight;

    const overlapX = isLeft
      ? ball.x - radius <= paddleRight && ball.x >= paddle.x
      : ball.x + radius >= paddle.x && ball.x <= paddleRight;

    const overlapY = ball.y + radius >= paddle.y && ball.y - radius <= paddleBottom;

    if (!overlapX || !overlapY) {
      return false;
    }

    // Position ball just outside paddle to avoid sticking
    ball.x = isLeft ? paddleRight + radius : paddle.x - radius;

    const paddleCenter = paddle.y + this.config.paddleHeight / 2;
    const distanceFromCenter = (ball.y - paddleCenter) / (this.config.paddleHeight / 2);
    const clampedDistance = Math.max(-1, Math.min(1, distanceFromCenter));

    const bounceAngle = clampedDistance * this.maxBounceAngle;
    const direction = isLeft ? 1 : -1;

    this.currentBallSpeed = Math.min(
      this.currentBallSpeed + this.speedIncrement,
      this.baseBallSpeed * this.maxSpeedMultiplier
    );

    const cos = Math.cos(bounceAngle);
    const sin = Math.sin(bounceAngle);

    ball.dx = this.currentBallSpeed * cos * direction;
    ball.dy = this.currentBallSpeed * sin;

    // Add spin based on paddle movement
    if (paddle.dy !== 0) {
      ball.dy -= paddle.dy * this.spinInfluence * 0.01;
    }

    // Prevent runaway vertical speeds
    const maxVertical = this.baseBallSpeed * this.maxSpeedMultiplier;
    ball.dy = Math.max(-maxVertical, Math.min(maxVertical, ball.dy));

    return true;
  }

  private checkScore(): void {
    const ball = this.gameState.ball;
    const radius = this.config.ballRadius;

    if (ball.x < -radius) {
      this.gameState.score.right++;
      this.onScoreChange?.({ ...this.gameState.score });
      this.handlePointLoss('left');
    } else if (ball.x > this.config.canvasWidth + radius) {
      this.gameState.score.left++;
      this.onScoreChange?.({ ...this.gameState.score });
      this.handlePointLoss('right');
    }
  }

  private handlePointLoss(lastTouched: 'left' | 'right'): void {
    const winner = lastTouched === 'left' ? 'right' : 'left';
    const scored = this.gameState.score[winner];

    if (scored >= this.config.maxScore) {
      this.handleGameOver(winner);
      return;
    }

    // Serve ball toward the player who lost the point
    const serveDirection = winner === 'left' ? 1 : -1;
    this.resetAfterScore(serveDirection);
  }

  private resetAfterScore(direction: number): void {
    this.gameState.ball.x = this.config.canvasWidth / 2;
    this.gameState.ball.y = this.config.canvasHeight / 2;
    this.gameState.leftPaddle.y = Math.max(
      0,
      Math.min(
        this.config.canvasHeight - this.config.paddleHeight,
        this.gameState.leftPaddle.y
      )
    );
    this.gameState.rightPaddle.y = Math.max(
      0,
      Math.min(
        this.config.canvasHeight - this.config.paddleHeight,
        this.gameState.rightPaddle.y
      )
    );

    this.currentBallSpeed = this.baseBallSpeed;
    this.launchBall(direction);
  }

  private handleGameOver(winner: 'left' | 'right'): void {
    this.gameState.isRunning = false;
    this.gameState.isPaused = false;
    cancelAnimationFrame(this.animationId);
    this.onGameEnd?.(winner, { ...this.gameState.score });
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;

    // Background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);

    // Center line
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 24]);
    ctx.beginPath();
    ctx.moveTo(this.config.canvasWidth / 2, 20);
    ctx.lineTo(this.config.canvasWidth / 2, this.config.canvasHeight - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // Paddles
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(
      this.gameState.leftPaddle.x,
      this.gameState.leftPaddle.y,
      this.config.paddleWidth,
      this.config.paddleHeight
    );

    ctx.fillRect(
      this.gameState.rightPaddle.x,
      this.gameState.rightPaddle.y,
      this.config.paddleWidth,
      this.config.paddleHeight
    );

    // Ball
    ctx.beginPath();
    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = 'rgba(99, 102, 241, 0.6)';
    ctx.shadowBlur = 12;
    ctx.arc(
      this.gameState.ball.x,
      this.gameState.ball.y,
      this.config.ballRadius,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Scoreboard
    ctx.font = '54px "Inter", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText(
      this.gameState.score.left.toString(),
      this.config.canvasWidth / 4,
      70
    );
    ctx.fillText(
      this.gameState.score.right.toString(),
      (this.config.canvasWidth * 3) / 4,
      70
    );

    // Pause overlay
    if (this.gameState.isPaused) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);
      ctx.font = '36px "Inter", sans-serif';
      ctx.fillStyle = '#e0f2fe';
      ctx.fillText('Paused', this.config.canvasWidth / 2, this.config.canvasHeight / 2);
      ctx.font = '18px "Inter", sans-serif';
      ctx.fillStyle = 'rgba(224, 242, 254, 0.8)';
      ctx.fillText('Press SPACE to resume', this.config.canvasWidth / 2, this.config.canvasHeight / 2 + 40);
    }

    // Controls helper
    ctx.font = '14px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.55)';
    ctx.textAlign = 'left';
    ctx.fillText('Left: W / S', 16, this.config.canvasHeight - 36);
    ctx.fillText('Right: ↑ / ↓', 16, this.config.canvasHeight - 16);
    ctx.textAlign = 'right';
    ctx.fillText('SPACE: Pause', this.config.canvasWidth - 16, this.config.canvasHeight - 36);
    ctx.fillText('R: Restart', this.config.canvasWidth - 16, this.config.canvasHeight - 16);
  }

  public setGameEndCallback(handler: GameEndHandler | null): void {
    this.onGameEnd = handler;
  }

  public setScoreCallback(handler: ScoreHandler | null): void {
    this.onScoreChange = handler;
  }

  public isRunning(): boolean {
    return this.gameState.isRunning && !this.gameState.isPaused;
  }

  public isPaused(): boolean {
    return this.gameState.isPaused;
  }

  public getGameState(): GameState {
    return structuredClone
      ? structuredClone(this.gameState)
      : JSON.parse(JSON.stringify(this.gameState));
  }

  public getConfig(): PongConfig {
    return { ...this.config };
  }
}
