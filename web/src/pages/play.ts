import { Page } from '../router';
import { PongEngine } from '../game/pong';
import { TournamentManager } from '../game/tournament-manager';

export class PlayPage implements Page {
  private pongGame: PongEngine | null = null;
  private tournamentManager: TournamentManager | null = null;
  private currentMatchId: string | null = null;
  private player1Alias: string | null = null;
  private player2Alias: string | null = null;

  render(): string {
    this.tournamentManager = new TournamentManager();

    const urlParams = new URLSearchParams(window.location.search);
    this.currentMatchId = urlParams.get('match');
    this.player1Alias = urlParams.get('p1');
    this.player2Alias = urlParams.get('p2');

    if (this.pongGame) {
      this.pongGame.destroy();
      this.pongGame = null;
    }

    setTimeout(() => this.initializeGame(), 0);

    const tournamentBanner = this.currentMatchId
      ? `
        <div class="match-banner">
          <h3>🏆 Tournament Match</h3>
          <p>
            <strong>${this.player1Alias || 'Player 1'}</strong>
            vs
            <strong>${this.player2Alias || 'Player 2'}</strong>
          </p>
          <span class="match-meta">Match ID: ${this.currentMatchId}</span>
        </div>
      `
      : '';

    const maxScore = new PongEngine().getConfig().maxScore;

    return `
      <div class="page">
        ${tournamentBanner}
        <h2>🎮 Head-to-Head Pong</h2>

        <div class="duel-layout">
          <aside class="duel-sidebar">
            <section class="panel panel-primary">
              <header class="panel-header">
                <h3>Match Setup</h3>
                <p class="panel-subtitle">Dial in the match before you take the court.</p>
              </header>

              <div class="field range-field">
                <label for="ball-speed">Ball Speed</label>
                <div class="range-row">
                  <input type="range" id="ball-speed" min="200" max="420" value="260">
                  <span class="value-tag" id="ball-speed-value">260</span>
                </div>
              </div>

              <div class="field range-field">
                <label for="paddle-size">Paddle Size</label>
                <div class="range-row">
                  <input type="range" id="paddle-size" min="60" max="130" value="88">
                  <span class="value-tag" id="paddle-size-value">88</span>
                </div>
              </div>

              <div class="button-stack">
                <button id="start-btn" class="btn">Start Match</button>
                <button id="pause-btn" class="btn btn-secondary" disabled>Pause</button>
                <button id="reset-btn" class="btn btn-secondary" disabled>Reset Score</button>
              </div>
            </section>

            <section class="panel">
              <header class="panel-header">
                <h3>Quick Controls</h3>
              </header>
              <ul class="bullet-list">
                <li><strong>Left player:</strong> W / S</li>
                <li><strong>Right player:</strong> ↑ / ↓ (or I / K)</li>
                <li><strong>Pause:</strong> Spacebar</li>
                <li><strong>Reset rally:</strong> R key</li>
              </ul>
            </section>

            <section class="panel panel-muted">
              <header class="panel-header">
                <h3>Match Tips</h3>
              </header>
              <ul class="feature-list">
                <li>Ball gains speed on every paddle collision.</li>
                <li>Off-center hits add spin—aim your returns.</li>
                <li>Adjust paddle size to balance skill levels.</li>
                <li>First to ${maxScore} points wins the match.</li>
              </ul>
            </section>
          </aside>

          <section class="duel-stage">
            <div id="game-status" class="status-banner">
              Configure your match and press <strong>Start Match</strong>.
            </div>

            <div class="canvas-wrapper">
              <canvas id="local-pong-canvas"></canvas>
            </div>

            <div class="scoreboard" id="local-scoreboard">
              <span id="score-left">0</span>
              <span class="divider">—</span>
              <span id="score-right">0</span>
            </div>
          </section>
        </div>

        <style>
          .match-banner {
            border: 2px solid var(--warning);
            padding: 1.25rem;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 1.5rem;
            background: rgba(251, 191, 36, 0.08);
          }

          .match-banner h3 {
            margin: 0 0 0.5rem 0;
          }

          .match-banner p {
            margin: 0 0 0.25rem 0;
            font-size: 1.15rem;
          }

          .match-meta {
            font-size: 0.85rem;
            opacity: 0.7;
          }

          .duel-layout {
            display: grid;
            grid-template-columns: 320px 1fr;
            gap: 2.4rem;
            margin-top: 2.5rem;
          }

          .duel-sidebar {
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

          .field input[type="range"] {
            accent-color: var(--primary);
          }

          .field input[type="range"],
          .field select {
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
            padding: 0;
          }

          .value-tag {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--accent);
          }

          .button-stack {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
          }

          .button-stack .btn {
            flex: 1 1 120px;
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

          .duel-stage {
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

          #local-pong-canvas {
            display: block;
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
            border-radius: 12px;
          }

          .scoreboard {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 1.5rem;
            font-size: 2.75rem;
            font-weight: 700;
            color: var(--light);
          }

          .scoreboard .divider {
            color: rgba(99, 102, 241, 0.7);
          }

          @media (max-width: 1120px) {
            .duel-layout {
              grid-template-columns: 1fr;
            }

            .duel-sidebar {
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
    const canvas = document.getElementById('local-pong-canvas') as HTMLCanvasElement | null;
    const startBtn = document.getElementById('start-btn') as HTMLButtonElement | null;
    const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement | null;
    const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement | null;
    const gameStatus = document.getElementById('game-status');
    const scoreLeft = document.getElementById('score-left');
    const scoreRight = document.getElementById('score-right');
    const ballSpeedSlider = document.getElementById('ball-speed') as HTMLInputElement | null;
    const paddleSizeSlider = document.getElementById('paddle-size') as HTMLInputElement | null;
    const ballSpeedValue = document.getElementById('ball-speed-value');
    const paddleSizeValue = document.getElementById('paddle-size-value');

    if (!canvas || !startBtn || !pauseBtn || !resetBtn || !ballSpeedSlider || !paddleSizeSlider || !scoreLeft || !scoreRight) {
      return;
    }

    const initialBallSpeed = parseInt(ballSpeedSlider.value, 10);
    const initialPaddleHeight = parseInt(paddleSizeSlider.value, 10);

    this.pongGame = new PongEngine({
      canvas,
      ballSpeed: initialBallSpeed,
      paddleHeight: initialPaddleHeight
    });

    const updateScoreboard = (score: { left: number; right: number }) => {
      scoreLeft.textContent = score.left.toString();
      scoreRight.textContent = score.right.toString();
    };

    const updateStatus = (message: string) => {
      if (gameStatus) {
        gameStatus.innerHTML = message;
      }
    };

    const leftLabel = this.player1Alias || 'Player 1';
    const rightLabel = this.player2Alias || 'Player 2';

    this.pongGame.setScoreCallback((score) => {
      updateScoreboard(score);
      updateStatus(`Score update: ${score.left} – ${score.right}`);
    });

    this.pongGame.setGameEndCallback((winner, score) => {
      const winnerLabel = winner === 'left' ? leftLabel : rightLabel;
      updateScoreboard(score);
      updateStatus(`🏁 Match complete! <strong>${winnerLabel}</strong> wins ${score.left} – ${score.right}.`);

      pauseBtn.disabled = true;
      pauseBtn.textContent = 'Pause';
      resetBtn.disabled = false;
      startBtn.disabled = false;
      startBtn.textContent = 'Play Again';

      if (this.currentMatchId) {
        this.handleTournamentMatchComplete(score);
      }
    });

    updateScoreboard({ left: 0, right: 0 });
    updateStatus('Configure your match and press <strong>Start Match</strong>.');

    startBtn.addEventListener('click', () => {
      if (!this.pongGame) return;

      if (this.pongGame.isRunning()) {
        this.pongGame.restartMatch();
        updateStatus('Match restarted. Game on!');
      } else {
        this.pongGame.startGame();
        updateStatus(`Match live! First to ${this.pongGame.getConfig().maxScore} points wins.`);
      }

      startBtn.textContent = 'Restart Match';
      pauseBtn.disabled = false;
      resetBtn.disabled = false;
      pauseBtn.textContent = 'Pause';
    });

    pauseBtn.addEventListener('click', () => {
      if (!this.pongGame) return;
      this.pongGame.togglePause();
      const paused = this.pongGame.isPaused();
      pauseBtn.textContent = paused ? 'Resume' : 'Pause';
      updateStatus(paused ? 'Game paused. Press resume to continue.' : 'Match live! Keep the rally going.');
    });

    resetBtn.addEventListener('click', () => {
      if (!this.pongGame) return;
      this.pongGame.restartMatch();
      updateStatus('Score reset. Serve to start the next rally!');
      startBtn.textContent = 'Restart Match';
      pauseBtn.textContent = 'Pause';
    });

    ballSpeedSlider.addEventListener('input', () => {
      const speed = parseInt(ballSpeedSlider.value, 10);
      if (ballSpeedValue) ballSpeedValue.textContent = speed.toString();
      this.pongGame?.updateConfig({ ballSpeed: speed });
    });

    paddleSizeSlider.addEventListener('input', () => {
      const height = parseInt(paddleSizeSlider.value, 10);
      if (paddleSizeValue) paddleSizeValue.textContent = height.toString();
      this.pongGame?.updateConfig({ paddleHeight: height });
    });
  }

  private handleTournamentMatchComplete(finalScore: { left: number; right: number }): void {
    if (!this.currentMatchId) return;

    const leftScore = finalScore.left;
    const rightScore = finalScore.right;
    const winnerAlias = leftScore > rightScore ? (this.player1Alias || 'Player 1') : (this.player2Alias || 'Player 2');

    const resultMessage = `🏆 ${winnerAlias} wins!\n\nScore: ${leftScore} - ${rightScore}\n\nSave result to the tournament bracket?`;

    if (!confirm(resultMessage)) {
      return;
    }

    try {
      const tournament = this.tournamentManager?.getCurrentTournament();
      const match = tournament?.matches.find((m) => m.id === this.currentMatchId);

      if (!match) {
        throw new Error('Match not found');
      }

      const winnerId = match.player1.alias === winnerAlias ? match.player1.id : match.player2.id;

      this.tournamentManager?.completeMatch(
        this.currentMatchId,
        winnerId,
        leftScore,
        rightScore
      );

      alert('Match result saved! Returning to tournament brackets.');
      window.history.pushState({}, '', '/tournament');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (error) {
      alert('Failed to save match result: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  public cleanup(): void {
    if (this.pongGame) {
      this.pongGame.destroy();
      this.pongGame = null;
    }
  }
}
