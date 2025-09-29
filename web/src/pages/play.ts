import { Page } from '../router';
import { PongEngine } from '../game/pong';

export class PlayPage implements Page {
  private pongGame: PongEngine | null = null;

  render(): string {
    // Clean up existing game when re-rendering
    if (this.pongGame) {
      this.pongGame.stopGame();
      this.pongGame = null;
    }

    setTimeout(() => this.initializeGame(), 0);

    return `
      <div class="page">
        <h2>🎮 Pong Game</h2>
        <p>Classic Pong with modern controls. Play against a friend!</p>
        
        <div style="margin: 2rem 0;">
          <div id="game-container" style="text-align: center; margin-bottom: 1rem;">
            <!-- Pong canvas will be mounted here -->
          </div>
          
          <div style="display: flex; justify-content: center; gap: 1rem; margin-bottom: 2rem;">
            <button id="start-btn" class="btn">Start Game</button>
            <button id="pause-btn" class="btn btn-secondary">Pause</button>
            <button id="reset-btn" class="btn btn-secondary">Reset</button>
          </div>
        </div>

        <div class="cards">
          <div class="card">
            <h3>🎮 Controls</h3>
            <div style="text-align: left; line-height: 1.8;">
              <strong>Left Player:</strong> W (Up) / S (Down)<br>
              <strong>Right Player:</strong> ↑ (Up) / ↓ (Down)<br>
              <strong>Pause:</strong> Spacebar<br>
              <strong>Reset:</strong> R key
            </div>
          </div>
          
          <div class="card">
            <h3>� Game Rules</h3>
            <div style="text-align: left; line-height: 1.8;">
              • First to 5 points wins<br>
              • Ball speed increases on paddle hits<br>
              • Paddle movement affects ball angle<br>
              • Use walls to your advantage
            </div>
          </div>
          
          <div class="card">
            <h3>⚙️ Settings</h3>
            <div style="text-align: left;">
              <label style="display: block; margin-bottom: 0.5rem;">
                <input type="range" id="ball-speed" min="150" max="400" value="250" style="width: 100%; margin-right: 0.5rem;">
                <span>Ball Speed</span>
              </label>
              <label style="display: block; margin-bottom: 0.5rem;">
                <input type="range" id="paddle-size" min="60" max="120" value="80" style="width: 100%; margin-right: 0.5rem;">
                <span>Paddle Size</span>
              </label>
            </div>
          </div>
        </div>
        
        <div style="margin-top: 2rem; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
          <h3>🏆 Current Match</h3>
          <div id="game-status" style="text-align: center; font-size: 1.1rem; margin-top: 1rem;">
            Click "Start Game" to begin playing!
          </div>
        </div>
      </div>
    `;
  }

  private initializeGame(): void {
    const gameContainer = document.getElementById('game-container');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const ballSpeedSlider = document.getElementById('ball-speed') as HTMLInputElement;
    const paddleSizeSlider = document.getElementById('paddle-size') as HTMLInputElement;
    const gameStatus = document.getElementById('game-status');

    if (!gameContainer) return;

    // Initialize Pong game
    this.pongGame = new PongEngine({
      ballSpeed: parseInt(ballSpeedSlider?.value || '250'),
      paddleHeight: parseInt(paddleSizeSlider?.value || '80')
    });

    // Button event handlers
    startBtn?.addEventListener('click', () => {
      if (this.pongGame && gameContainer) {
        this.pongGame.startGame(gameContainer);
        if (gameStatus) gameStatus.textContent = 'Game in progress! Good luck!';
      }
    });

    pauseBtn?.addEventListener('click', () => {
      if (this.pongGame) {
        this.pongGame.pauseGame();
      }
    });

    resetBtn?.addEventListener('click', () => {
      if (this.pongGame) {
        this.pongGame.resetGame();
        if (gameStatus) gameStatus.textContent = 'Game reset! Score: 0 - 0';
      }
    });

    // Settings handlers
    ballSpeedSlider?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (this.pongGame) {
        // Note: In a full implementation, you'd update config and restart
        console.log('Ball speed changed to:', target.value);
      }
    });

    paddleSizeSlider?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (this.pongGame) {
        // Note: In a full implementation, you'd update config and restart
        console.log('Paddle size changed to:', target.value);
      }
    });
  }

  // Cleanup when navigating away from page
  public cleanup(): void {
    if (this.pongGame) {
      this.pongGame.stopGame();
      this.pongGame = null;
    }
  }
}