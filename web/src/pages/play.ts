import { Page } from '../router';
import { PongEngine } from '../game/pong';
import { TournamentManager } from '../game/tournament-manager';
import { WebSocketGameClient } from '../services/websocket-game-client';
import { AuthService } from '../services/auth-service';

export class PlayPage implements Page {
  private pongGame: PongEngine | null = null;
  private tournamentManager: TournamentManager | null = null;
  private wsGameClient: WebSocketGameClient | null = null;
  private authService: AuthService;
  private currentMatchId: string | null = null;
  private player1Alias: string | null = null;
  private player2Alias: string | null = null;
  private isOnlineMatch = false;

  render(): string {
    this.tournamentManager = new TournamentManager();
    this.authService = new AuthService();

    const urlParams = new URLSearchParams(window.location.search);
    this.currentMatchId = urlParams.get('match');
    this.player1Alias = urlParams.get('p1');
    this.player2Alias = urlParams.get('p2');
    this.isOnlineMatch = urlParams.get('online') === 'true';

    if (this.pongGame) {
      this.pongGame.destroy();
      this.pongGame = null;
    }
    if (this.wsGameClient) {
      this.wsGameClient.disconnect();
      this.wsGameClient = null;
    }

    setTimeout(() => this.initializeGame(), 0);

    const matchBanner = this.currentMatchId
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

    return `
      <div class="page">
        ${matchBanner}

        <h2>🎮 Head-to-Head Pong</h2>
        <p>Responsive controls, richer physics, and tournament-ready presentation for local play.</p>

        <div class="game-layout">
          <div class="game-controls">
            <div class="control-group">
              <h3>Game Settings</h3>
              <label>
                Ball Speed
                <span id="ball-speed-value" class="setting-value">260</span>
              </label>
              <input type="range" id="ball-speed" min="200" max="420" value="260">

              <label>
                Paddle Size
                <span id="paddle-size-value" class="setting-value">88</span>
              </label>
              <input type="range" id="paddle-size" min="60" max="130" value="88">

              <p class="setting-hint">Changes apply immediately, even mid-rally.</p>
            </div>

            <div class="control-group">
              <h3>Controls</h3>
              <ul>
                <li><strong>Left player:</strong> W / S</li>
                <li><strong>Right player:</strong> ↑ / ↓ (or I / K)</li>
                <li><strong>Pause:</strong> Spacebar</li>
                <li><strong>Restart:</strong> R key</li>
              </ul>
            </div>

            <div class="control-group">
              <h3>Match Tips</h3>
              <ul>
                <li>Spin the ball by moving while striking.</li>
                <li>Serve alternates after every point.</li>
                <li>First to <strong>5</strong> wins the match.</li>
              </ul>
            </div>
          </div>

          <div class="game-area">
            <div id="game-status" class="game-status">
              Configure your settings and press <strong>Start Match</strong>.
            </div>

            <canvas id="local-pong-canvas"></canvas>

            <div class="scoreboard" id="local-scoreboard">
              <span id="score-left">0</span>
              <span class="divider">—</span>
              <span id="score-right">0</span>
            </div>

            <div class="button-row">
              <button id="start-btn" class="btn">Start Match</button>
              <button id="pause-btn" class="btn btn-secondary" disabled>Pause</button>
              <button id="reset-btn" class="btn btn-secondary" disabled>Reset Score</button>
            </div>
          </div>
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
          .game-layout {
            display: flex;
            gap: 2.5rem;
            margin-top: 2.5rem;
            flex-wrap: wrap;
          }
          .game-controls {
            flex: 0 0 320px;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
          }
          .control-group {
            background: rgba(15, 23, 42, 0.55);
            border: 1px solid rgba(99, 102, 241, 0.35);
            border-radius: 12px;
            padding: 1.5rem;
          }
          .control-group h3 {
            margin-top: 0;
            margin-bottom: 1rem;
            color: var(--accent);
          }
          .control-group label {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 600;
            margin-bottom: 0.35rem;
          }
          .setting-value {
            font-size: 0.9rem;
            color: var(--text-muted);
          }
          .control-group input[type="range"] {
            width: 100%;
            margin-bottom: 1rem;
          }
          .control-group ul {
            list-style: none;
            padding: 0;
            margin: 0;
            display: grid;
            gap: 0.5rem;
            font-size: 0.95rem;
          }
          .setting-hint {
            font-size: 0.85rem;
            color: var(--text-muted);
            margin-top: 0.5rem;
          }
          .game-area {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }
          .game-status {
            background: rgba(79, 70, 229, 0.12);
            border: 1px solid rgba(99, 102, 241, 0.4);
            border-radius: 10px;
            padding: 1rem 1.25rem;
            font-weight: 600;
            text-align: center;
            color: var(--light);
          }
          #local-pong-canvas {
            width: 100%;
            max-width: 860px;
            height: auto;
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
          .button-row {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            justify-content: center;
          }
          .button-row .btn {
            min-width: 150px;
          }
          @media (max-width: 1024px) {
            .game-layout {
              flex-direction: column;
            }
            .game-controls {
              flex: none;
              width: 100%;
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
    updateStatus('Configure your settings and press <strong>Start Match</strong>.');

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
      ballSpeedValue!.textContent = speed.toString();
      this.pongGame?.updateConfig({ ballSpeed: speed });
    });

    paddleSizeSlider.addEventListener('input', () => {
      const height = parseInt(paddleSizeSlider.value, 10);
      paddleSizeValue!.textContent = height.toString();
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
