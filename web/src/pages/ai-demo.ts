import { Page } from '../router';
import { EnhancedPongEngine } from '../game/pong-ai';

export class AIPage implements Page {
  private pongGame: EnhancedPongEngine | null = null;

  render(): string {
    setTimeout(() => this.initializeGame(), 0);

    return `
      <div class="page">
        <h2>🤖 AI vs Human Pong</h2>
        <div class="ai-layout">
          <aside class="ai-sidebar">
            <section class="panel panel-primary">
              <header class="panel-header">
                <h3>Match Setup</h3>
                <p class="panel-subtitle">Tune the arena and AI personality before you play.</p>
              </header>
              <div class="field range-field">
                <label for="ball-speed">Ball Speed</label>
                <div class="range-row">
                  <input type="range" id="ball-speed" min="150" max="400" value="250">
                  <div class="value-tag" id="ball-speed-value">250</div>
                </div>
              </div>

              <div class="field range-field">
                <label for="paddle-size">Paddle Size</label>
                <div class="range-row">
                  <input type="range" id="paddle-size" min="60" max="120" value="80">
                  <div class="value-tag" id="paddle-size-value">80</div>
                </div>
              </div>

              <div class="field">
                <label for="ai-difficulty">AI Difficulty</label>
                <select id="ai-difficulty">
                  <option value="0.3">🟢 Easy · Laid-back reflexes</option>
                  <option value="0.6" selected>🟡 Medium · Balanced response</option>
                  <option value="0.9">🔴 Hard · Tournament ready</option>
                </select>
              </div>

              <div class="field">
                <label for="ai-side">Your Side</label>
                <select id="ai-side">
                  <option value="left" selected>Left (W / S)</option>
                  <option value="right">Right (↑ / ↓)</option>
                </select>
              </div>

              <div class="button-stack">
                <button id="start-game" class="btn">Play Match</button>
                <button id="reset-game" class="btn btn-secondary">Reset</button>
              </div>
            </section>

            <section class="panel">
              <header class="panel-header">
                <h3>Quick Reference</h3>
              </header>
              <ul class="bullet-list">
                <li><strong>Left player:</strong> W / S</li>
                <li><strong>Right player:</strong> ↑ / ↓ or I / K</li>
                <li><strong>Goal:</strong> First to 5 points wins</li>
                <li><strong>Pause:</strong> Space · <strong>Restart:</strong> R</li>
              </ul>
            </section>

            <section class="panel panel-muted">
              <header class="panel-header">
                <h3>How The AI Thinks</h3>
              </header>
              <ul class="feature-list">
                <li>Predicts ball impact and angles the paddle accordingly.</li>
                <li>Adapts reaction speed and precision to selected difficulty.</li>
                <li>Imitates human mistakes with controlled randomness.</li>
                <li>Respects paddle physics—no unfair teleporting moves.</li>
              </ul>
            </section>
          </aside>

          <section class="ai-stage">
            <div id="game-status" class="status-banner">
              Pick your settings and press <strong>Play Match</strong>.
            </div>

            <div class="canvas-wrapper">
              <canvas id="pong-canvas"></canvas>
            </div>

            <div id="game-results" class="results-card" aria-live="polite">
              <div id="winner-text" class="results-title"></div>
              <button id="play-again" class="btn">Play Again</button>
            </div>
          </section>
        </div>

        <style>
          .ai-layout {
            display: grid;
            grid-template-columns: 320px 1fr;
            gap: 2.4rem;
            margin-top: 2.5rem;
          }

          .ai-sidebar {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
          }

          .panel {
            background: rgba(15, 23, 42, 0.65);
            border: 1px solid rgba(99, 102, 241, 0.25);
            border-radius: 16px;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .panel-primary {
            border-color: rgba(99, 102, 241, 0.55);
            box-shadow: 0 18px 35px rgba(15, 23, 42, 0.35);
          }

          .panel-muted {
            background: rgba(15, 23, 42, 0.45);
          }

          .panel-header h3 {
            margin: 0;
            font-size: 1.1rem;
            color: var(--light);
          }

          .panel-subtitle {
            margin: 0.35rem 0 0 0;
            font-size: 0.85rem;
            color: var(--text-muted);
          }

          .field {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .field label {
            font-weight: 600;
            color: var(--light);
            font-size: 0.95rem;
          }

          .field select,
          .field input[type="range"] {
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(148, 163, 184, 0.2);
            border-radius: 10px;
            padding: 0.6rem 0.8rem;
            color: var(--light);
            font-size: 0.95rem;
          }

          .field input[type="range"] {
            accent-color: var(--primary);
            padding: 0;
          }

          .range-field select,
          .range-field input[type="range"] {
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(148, 163, 184, 0.2);
            border-radius: 10px;
            padding: 0.6rem 0.8rem;
            color: var(--light);
            font-size: 0.95rem;
          }

          .range-row {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .range-row input[type="range"] {
            flex: 1;
          }

          .value-tag {
            align-self: flex-end;
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--accent);
          }

          .button-stack {
            display: flex;
            gap: 0.75rem;
          }

          .bullet-list,
          .feature-list {
            margin: 0;
            padding-left: 1.1rem;
            display: grid;
            gap: 0.5rem;
            font-size: 0.9rem;
            color: var(--light);
          }

          .feature-list {
            list-style: disc;
          }

          .ai-stage {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }

          .status-banner {
            text-align: center;
            font-weight: 600;
            font-size: 1rem;
            padding: 0.9rem 1.25rem;
            border-radius: 12px;
            background: rgba(79, 70, 229, 0.1);
            border: 1px solid rgba(99, 102, 241, 0.25);
          }

          .canvas-wrapper {
            background: radial-gradient(circle at top, rgba(30, 64, 175, 0.25), rgba(2, 6, 23, 0.95));
            border-radius: 18px;
            padding: 1.25rem;
            box-shadow: inset 0 0 35px rgba(15, 23, 42, 0.55);
          }

          #pong-canvas {
            display: block;
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
            border-radius: 12px;
          }

          .results-card {
            display: none;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            padding: 1.5rem;
            border-radius: 12px;
            background: rgba(30, 41, 59, 0.75);
            border: 1px solid rgba(148, 163, 184, 0.18);
          }

          .results-title {
            font-size: 1.4rem;
            font-weight: 700;
          }

          @media (max-width: 1120px) {
            .ai-layout {
              grid-template-columns: 1fr;
            }

            .ai-sidebar {
              flex-direction: row;
              flex-wrap: wrap;
            }

            .panel {
              flex: 1 1 300px;
            }
          }

          @media (max-width: 720px) {
            .button-stack {
              flex-direction: column;
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
