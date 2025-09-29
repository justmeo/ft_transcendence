import { Page } from '../router';
import { PongEngine } from '../game/pong';
import { TournamentManager } from '../game/tournament-manager';

export class PlayPage implements Page {
  private pongGame: PongEngine | null = null;
  private tournamentManager: TournamentManager;
  private currentMatchId: string | null = null;
  private player1Alias: string | null = null;
  private player2Alias: string | null = null;

  render(): string {
    // Initialize tournament manager
    this.tournamentManager = new TournamentManager();
    
    // Parse URL parameters for tournament matches
    const urlParams = new URLSearchParams(window.location.search);
    this.currentMatchId = urlParams.get('match');
    this.player1Alias = urlParams.get('p1');
    this.player2Alias = urlParams.get('p2');
    
    // Clean up existing game when re-rendering
    if (this.pongGame) {
      this.pongGame.stopGame();
      this.pongGame = null;
    }

    setTimeout(() => this.initializeGame(), 0);

    return `
      <div class="page">
        ${this.currentMatchId ? `
          <div class="card" style="margin-bottom: 1rem; border: 2px solid var(--warning); text-align: center;">
            <h3>🏆 Tournament Match</h3>
            <div style="font-size: 1.2rem; margin: 0.5rem 0;">
              <strong>${this.player1Alias || 'Player 1'}</strong> vs <strong>${this.player2Alias || 'Player 2'}</strong>
            </div>
            <div style="font-size: 0.9rem; opacity: 0.8;">
              Match ID: ${this.currentMatchId}
            </div>
          </div>
        ` : ''}
        
        <h2>🎮 Pong Game</h2>
        <p>${this.currentMatchId ? 'Tournament match in progress!' : 'Classic Pong with modern controls. Play against a friend!'}</p>
        
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

    // Add game completion listener for tournament matches
    if (this.currentMatchId) {
      this.setupTournamentGameHandler();
    }

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

  private setupTournamentGameHandler(): void {
    if (!this.currentMatchId || !this.pongGame) return;

    // Poll game state to detect when game ends
    const gameStateChecker = setInterval(() => {
      if (!this.pongGame) {
        clearInterval(gameStateChecker);
        return;
      }

      const gameState = this.pongGame.getGameState();
      const config = this.pongGame.getConfig();
      
      // Check if game is completed (reached max score)
      if (gameState.score.left >= config.maxScore || gameState.score.right >= config.maxScore) {
        clearInterval(gameStateChecker);
        this.handleTournamentMatchComplete(gameState);
      }
    }, 1000);
  }

  private handleTournamentMatchComplete(gameState: any): void {
    if (!this.currentMatchId) return;

    const leftScore = gameState.score.left;
    const rightScore = gameState.score.right;
    const winnerAlias = leftScore > rightScore ? this.player1Alias : this.player2Alias;
    
    // Show match result dialog
    const resultMessage = `🏆 ${winnerAlias} wins!\n\nScore: ${leftScore} - ${rightScore}\n\nSave result to tournament?`;
    
    if (confirm(resultMessage)) {
      try {
        // Get the actual match to find player IDs
        const tournament = this.tournamentManager.getCurrentTournament();
        const match = tournament?.matches.find(m => m.id === this.currentMatchId);
        
        if (!match) {
          throw new Error('Match not found');
        }
        
        // Determine winner ID based on alias
        const winnerId = match.player1.alias === winnerAlias ? match.player1.id : match.player2.id;
        
        // Complete the match in tournament
        this.tournamentManager.completeMatch(
          this.currentMatchId,
          winnerId,
          leftScore,
          rightScore
        );
        
        alert('Match result saved! Returning to tournament...');
        
        // Navigate back to tournament page
        window.history.pushState({}, '', '/tournament');
        window.dispatchEvent(new PopStateEvent('popstate'));
        
      } catch (error) {
        alert('Failed to save match result: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  }

  // Cleanup when navigating away from page
  public cleanup(): void {
    if (this.pongGame) {
      this.pongGame.stopGame();
      this.pongGame = null;
    }
  }
}