import { Page } from '../router';
import { EnhancedPongEngine } from '../game/pong-ai';

export class AIPage implements Page {
  private pongGame: EnhancedPongEngine | null = null;

  render(): string {
    setTimeout(() => this.initializeGame(), 0);

    return `
      <div class="page">
        <h2>🤖 AI vs Human Pong</h2>
        <p>Test your skills against our AI opponent! The AI analyzes ball trajectory, predicts bounces, and responds like a human player.</p>

        <div class="game-container">
          <div class="game-controls">
            <div class="control-group">
              <h3>Game Settings</h3>
              
              <div style="margin-bottom: 1rem;">
                <label for="ball-speed">Ball Speed:</label>
                <input type="range" id="ball-speed" min="150" max="400" value="250" style="margin: 0 0.5rem;">
                <span id="ball-speed-value">250</span>
              </div>

              <div style="margin-bottom: 1rem;">
                <label for="paddle-size">Paddle Size:</label>
                <input type="range" id="paddle-size" min="60" max="120" value="80" style="margin: 0 0.5rem;">
                <span id="paddle-size-value">80</span>
              </div>

              <div style="margin-bottom: 1rem;">
                <label for="ai-difficulty">AI Difficulty:</label>
                <select id="ai-difficulty" style="margin-left: 0.5rem; padding: 0.25rem;">
                  <option value="0.3">🟢 Easy - Slow reactions, poor prediction</option>
                  <option value="0.6" selected>🟡 Medium - Balanced gameplay</option>
                  <option value="0.9">🔴 Hard - Fast reactions, good prediction</option>
                </select>
              </div>

              <div style="margin-bottom: 1rem;">
                <label for="ai-side">You play as:</label>
                <select id="ai-side" style="margin-left: 0.5rem; padding: 0.25rem;">
                  <option value="left" selected>Left Side (W/S keys)</option>
                  <option value="right">Right Side (↑/↓ keys)</option>
                </select>
              </div>

              <div style="margin-bottom: 1rem;">
                <button id="start-game" class="btn">Start New Game</button>
                <button id="reset-game" class="btn btn-secondary" style="margin-left: 0.5rem;">Reset</button>
              </div>
            </div>

            <div class="control-group">
              <h3>Controls</h3>
              <div style="font-size: 0.9rem;">
                <div><strong>Left Side:</strong> W (up) / S (down)</div>
                <div><strong>Right Side:</strong> ↑ (up) / ↓ (down)</div>
                <div style="margin-top: 0.5rem; opacity: 0.8;">First to 5 points wins!</div>
              </div>
            </div>

            <div class="control-group">
              <h3>AI Features</h3>
              <ul style="font-size: 0.9rem; margin: 0; padding-left: 1.2rem;">
                <li>Samples game state at 1Hz (like human vision)</li>
                <li>Predicts ball trajectory with wall bounces</li>
                <li>Respects paddle speed limits</li>
                <li>Makes human-like mistakes</li>
                <li>Adjustable difficulty affects reaction time</li>
              </ul>
            </div>
          </div>

          <div class="game-area">
            <div id="game-status" style="text-align: center; margin-bottom: 1rem; font-size: 1.1rem; font-weight: 500;">
              Configure settings and click "Start New Game"
            </div>
            
            <canvas id="pong-canvas" style="display: block; margin: 0 auto;"></canvas>
            
            <div id="game-results" style="text-align: center; margin-top: 1rem; display: none;">
              <div id="winner-text" style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;"></div>
              <button id="play-again" class="btn">Play Again</button>
            </div>
          </div>
        </div>

        <style>
          .game-container {
            display: flex;
            gap: 2rem;
            margin-top: 2rem;
          }
          
          .game-controls {
            flex: 0 0 300px;
          }
          
          .game-area {
            flex: 1;
            min-width: 0;
          }
          
          .control-group {
            background: rgba(255, 255, 255, 0.05);
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 1rem;
          }
          
          .control-group h3 {
            margin: 0 0 1rem 0;
            color: var(--primary);
          }
          
          .control-group label {
            display: inline-block;
            margin-bottom: 0.5rem;
            font-weight: 500;
          }
          
          .control-group input[type="range"] {
            width: 100px;
          }
          
          .control-group select {
            background: rgba(255, 255, 255, 0.1);
            color: var(--text-light);
            border: 1px solid var(--border);
            border-radius: 4px;
          }
          
          #pong-canvas {
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          }
          
          @media (max-width: 1024px) {
            .game-container {
              flex-direction: column;
            }
            
            .game-controls {
              flex: none;
            }
          }
        </style>
      </div>
    `;
  }

  private initializeGame(): void {
    this.setupEventHandlers();
    this.updateSliderValues();
  }

  private setupEventHandlers(): void {
    // Slider value updates
    const ballSpeedSlider = document.getElementById('ball-speed') as HTMLInputElement;
    const paddleSizeSlider = document.getElementById('paddle-size') as HTMLInputElement;

    ballSpeedSlider?.addEventListener('input', () => {
      document.getElementById('ball-speed-value')!.textContent = ballSpeedSlider.value;
    });

    paddleSizeSlider?.addEventListener('input', () => {
      document.getElementById('paddle-size-value')!.textContent = paddleSizeSlider.value;
    });

    // Game controls
    document.getElementById('start-game')?.addEventListener('click', () => {
      this.startNewGame();
    });

    document.getElementById('reset-game')?.addEventListener('click', () => {
      this.resetGame();
    });

    document.getElementById('play-again')?.addEventListener('click', () => {
      this.startNewGame();
    });

    // AI difficulty change
    document.getElementById('ai-difficulty')?.addEventListener('change', () => {
      this.updateAIDifficulty();
    });
  }

  private updateSliderValues(): void {
    const ballSpeedSlider = document.getElementById('ball-speed') as HTMLInputElement;
    const paddleSizeSlider = document.getElementById('paddle-size') as HTMLInputElement;

    if (ballSpeedSlider) {
      document.getElementById('ball-speed-value')!.textContent = ballSpeedSlider.value;
    }
    if (paddleSizeSlider) {
      document.getElementById('paddle-size-value')!.textContent = paddleSizeSlider.value;
    }
  }

  private startNewGame(): void {
    // Get settings
    const ballSpeed = parseInt((document.getElementById('ball-speed') as HTMLInputElement).value);
    const paddleHeight = parseInt((document.getElementById('paddle-size') as HTMLInputElement).value);
    const aiDifficulty = parseFloat((document.getElementById('ai-difficulty') as HTMLSelectElement).value);
    const aiSideSelect = (document.getElementById('ai-side') as HTMLSelectElement).value;
    const humanSide = aiSideSelect === 'left' ? 'right' : 'left';

    // Clean up existing game
    if (this.pongGame) {
      this.pongGame.stopGame();
    }

    // Create AI-enhanced game
    this.pongGame = new EnhancedPongEngine({
      ballSpeed,
      paddleHeight,
      enableAI: true,
      aiDifficulty,
      aiSide: humanSide === 'left' ? 'right' : 'left',
      canvasId: 'pong-canvas'
    });

    // Set up game end callback
    this.pongGame.setGameEndCallback((winner) => {
      this.handleGameEnd(winner);
    });

    // Update status
    const statusDiv = document.getElementById('game-status');
    if (statusDiv) {
      const humanSideText = humanSide === 'left' ? 'Left' : 'Right';
      const aiSideText = humanSide === 'left' ? 'Right' : 'Left';
      statusDiv.innerHTML = `🎮 You: ${humanSideText} side | 🤖 AI: ${aiSideText} side | Playing to 5 points`;
    }

    // Hide results
    const resultsDiv = document.getElementById('game-results');
    if (resultsDiv) resultsDiv.style.display = 'none';

    // Start the game
    this.pongGame.startGame();
  }

  private resetGame(): void {
    if (this.pongGame) {
      this.pongGame.stopGame();
    }
    
    const statusDiv = document.getElementById('game-status');
    if (statusDiv) {
      statusDiv.textContent = 'Configure settings and click "Start New Game"';
    }

    const resultsDiv = document.getElementById('game-results');
    if (resultsDiv) resultsDiv.style.display = 'none';
  }

  private updateAIDifficulty(): void {
    if (this.pongGame) {
      const aiDifficulty = parseFloat((document.getElementById('ai-difficulty') as HTMLSelectElement).value);
      this.pongGame.setAIDifficulty(aiDifficulty);
    }
  }

  private handleGameEnd(winner: 'left' | 'right'): void {
    const aiSideSelect = (document.getElementById('ai-side') as HTMLSelectElement).value;
    const humanSide = aiSideSelect === 'left' ? 'left' : 'right';
    
    const isHumanWinner = winner === humanSide;
    const winnerText = isHumanWinner ? '🎉 You Win!' : '🤖 AI Wins!';
    
    // Show results
    const resultsDiv = document.getElementById('game-results');
    const winnerTextDiv = document.getElementById('winner-text');
    
    if (resultsDiv && winnerTextDiv) {
      winnerTextDiv.textContent = winnerText;
      winnerTextDiv.style.color = isHumanWinner ? 'var(--success)' : 'var(--warning)';
      resultsDiv.style.display = 'block';
    }

    // Update status
    const statusDiv = document.getElementById('game-status');
    if (statusDiv) {
      const scores = this.pongGame?.getScores();
      if (scores) {
        statusDiv.innerHTML = `Game Over! Final Score: ${scores.left} - ${scores.right}`;
      }
    }
  }

  public cleanup(): void {
    if (this.pongGame) {
      this.pongGame.stopGame();
      this.pongGame = null;
    }
  }
}