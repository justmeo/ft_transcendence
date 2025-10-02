import { Page } from '../router';
import { TournamentApiService, Tournament, Match, Participant } from '../services/tournament-api-service';
import { AuthService } from '../services/auth-service';

export class TournamentPage implements Page {
  private tournamentManager: TournamentManager;

  constructor() {
    this.tournamentManager = new TournamentManager();
  }

  render(): string {
    setTimeout(() => this.initializeEventHandlers(), 0);

    const tournament = this.tournamentManager.getCurrentTournament();
    
    if (!tournament) {
      return this.renderCreateTournament();
    }

    switch (tournament.status) {
      case 'registration':
        return this.renderRegistration(tournament);
      case 'active':
        return this.renderActiveTournament(tournament);
      case 'completed':
        return this.renderCompletedTournament(tournament);
      default:
        return this.renderCreateTournament();
    }
  }

  private renderCreateTournament(): string {
    return `
      <div class="page">
        <h2>🏆 Tournament Manager</h2>
        <p>Create and manage your own Pong tournaments!</p>
        
        <div class="card" style="max-width: 500px; margin: 2rem auto;">
          <h3>Create New Tournament</h3>
          
          <div style="margin: 1.5rem 0;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Tournament Name:</label>
            <input type="text" id="tournament-name" placeholder="Enter tournament name" 
                   style="width: 100%; padding: 0.75rem; margin-bottom: 1rem;" value="Pong Championship">
          </div>
          
          <div style="margin: 1.5rem 0;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Tournament Type:</label>
            <select id="tournament-type" style="width: 100%; padding: 0.75rem;">
              <option value="single-elimination">Single Elimination</option>
              <option value="round-robin">Round Robin</option>
            </select>
          </div>
          
          <button id="create-tournament" class="btn" style="width: 100%; margin-top: 1rem;">
            Create Tournament
          </button>
        </div>
        
        <div class="cards">
          <div class="card">
            <h3>📋 Tournament Types</h3>
            <div style="text-align: left; line-height: 1.8;">
              <strong>Single Elimination:</strong> Lose once and you're out. Fast-paced brackets.<br>
              <strong>Round Robin:</strong> Everyone plays everyone. Most wins wins.
            </div>
          </div>
          
          <div class="card">
            <h3>⚡ Features</h3>
            <div style="text-align: left; line-height: 1.8;">
              • Player registration system<br>
              • Automatic bracket generation<br>
              • Real-time match tracking<br>
              • Persistent tournament state
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderRegistration(tournament: Tournament): string {
    const players = this.tournamentManager.getPlayersList();
    
    return `
      <div class="page">
        <h2>🏆 ${tournament.name}</h2>
        <p>Registration Phase - Add players to the tournament</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
          <div class="card">
            <h3>➕ Register Players</h3>
            
            <div style="margin: 1rem 0;">
              <input type="text" id="player-alias" placeholder="Enter player alias" 
                     style="width: 100%; padding: 0.75rem; margin-bottom: 1rem;"
                     maxlength="20">
              <button id="add-player" class="btn" style="width: 100%;">Add Player</button>
            </div>
            
            <div style="margin-top: 1.5rem;">
              <small style="opacity: 0.8;">
                Tournament Type: ${tournament.type === 'single-elimination' ? 'Single Elimination' : 'Round Robin'}<br>
                Minimum Players: 2
              </small>
            </div>
          </div>
          
          <div class="card">
            <h3>👥 Registered Players (${players.length})</h3>
            
            <div id="players-list" style="max-height: 200px; overflow-y: auto;">
              ${players.map((player, index) => `
                <div style="display: flex; justify-content: space-between; align-items: center; 
                           padding: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                  <span>${index + 1}. ${player.alias}</span>
                  <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" 
                          data-player-id="${player.id}">Remove</button>
                </div>
              `).join('')}
              ${players.length === 0 ? '<div style="text-align: center; opacity: 0.6; padding: 1rem;">No players registered yet</div>' : ''}
            </div>
          </div>
        </div>
        
        <div style="text-align: center; margin: 2rem 0;">
          <button id="start-tournament" class="btn" ${players.length < 2 ? 'disabled' : ''} 
                  style="margin-right: 1rem;">
            Start Tournament (${players.length} players)
          </button>
          <button id="reset-tournament" class="btn btn-secondary">Reset Tournament</button>
        </div>
      </div>
    `;
  }

  private renderActiveTournament(tournament: Tournament): string {
    const currentMatch = this.tournamentManager.getCurrentMatch();
    const upcomingMatches = this.tournamentManager.getUpcomingMatches();
    const completedMatches = this.tournamentManager.getCompletedMatches();
    const standings = this.tournamentManager.getStandings();
    const stats = this.tournamentManager.getTournamentStats();

    return `
      <div class="page">
        <h2>🏆 ${tournament.name}</h2>
        <p>${tournament.type === 'single-elimination' ? 'Single Elimination' : 'Round Robin'} Tournament - ${stats?.progress}% Complete</p>
        
        ${currentMatch ? `
          <div class="card" style="margin-bottom: 2rem; border: 2px solid var(--primary);">
            <h3>🎮 Current Match</h3>
            <div style="text-align: center; margin: 1.5rem 0;">
              <div style="font-size: 1.5rem; margin-bottom: 1rem;">
                <strong>${currentMatch.player1.alias}</strong> vs <strong>${currentMatch.player2.alias}</strong>
              </div>
              <button id="play-match" class="btn" data-match-id="${currentMatch.id}">
                Play Now
              </button>
            </div>
          </div>
        ` : ''}
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
          <div class="card">
            <h3>📊 Tournament Progress</h3>
            <div style="margin: 1rem 0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span>Completed Matches:</span>
                <span>${stats?.completedMatches} / ${stats?.totalMatches}</span>
              </div>
              <div style="background: rgba(255,255,255,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
                <div style="background: var(--primary); height: 100%; width: ${stats?.progress}%; transition: width 0.3s ease;"></div>
              </div>
            </div>
          </div>
          
          <div class="card">
            <h3>🏅 Current Standings</h3>
            <div style="margin-top: 1rem;">
              ${standings.slice(0, 5).map((player, index) => `
                <div style="display: flex; justify-content: space-between; padding: 0.25rem 0;">
                  <span>${index + 1}. ${player.alias}</span>
                  <span>${player.wins}W - ${player.losses}L</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 2rem;">
          <button id="reset-tournament" class="btn btn-secondary">Reset Tournament</button>
        </div>
      </div>
    `;
  }

  private renderCompletedTournament(tournament: Tournament): string {
    const standings = this.tournamentManager.getStandings();

    return `
      <div class="page">
        <h2>🏆 ${tournament.name} - COMPLETED!</h2>
        <p>Tournament finished! Congratulations to all participants.</p>
        
        <div class="card" style="margin-bottom: 2rem; border: 2px solid var(--success); text-align: center;">
          <h3>🥇 Champion</h3>
          <div style="font-size: 2rem; margin: 1rem 0; color: var(--success);">
            ${tournament.winner?.alias || 'Unknown'}
          </div>
          <div style="opacity: 0.8;">
            ${tournament.winner?.wins} wins - ${tournament.winner?.losses} losses
          </div>
        </div>
        
        <div class="card">
          <h3>🏅 Final Standings</h3>
          <div style="margin-top: 1rem;">
            ${standings.map((player, index) => `
              <div style="display: flex; justify-content: space-between; padding: 0.5rem; 
                         ${index === 0 ? 'background: rgba(16, 185, 129, 0.2); border-radius: 4px;' : ''}">
                <span>
                  ${index + 1}. ${player.alias}
                  ${index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}
                </span>
                <span>${player.wins}W - ${player.losses}L</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 2rem;">
          <button id="new-tournament" class="btn">Create New Tournament</button>
        </div>
      </div>
    `;
  }

  private initializeEventHandlers(): void {
    // Create tournament
    document.getElementById('create-tournament')?.addEventListener('click', () => {
      const nameInput = document.getElementById('tournament-name') as HTMLInputElement;
      const typeSelect = document.getElementById('tournament-type') as HTMLSelectElement;
      
      if (nameInput?.value.trim()) {
        this.tournamentManager.createTournament(
          nameInput.value.trim(),
          typeSelect?.value as 'round-robin' | 'single-elimination'
        );
        this.refresh();
      }
    });

    // Add player
    document.getElementById('add-player')?.addEventListener('click', () => {
      this.addPlayer();
    });

    document.getElementById('player-alias')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addPlayer();
      }
    });

    // Remove player buttons
    document.querySelectorAll('[data-player-id]').forEach(button => {
      button.addEventListener('click', (e) => {
        const playerId = (e.target as HTMLElement).dataset.playerId;
        if (playerId) this.removePlayer(playerId);
      });
    });

    // Start tournament
    document.getElementById('start-tournament')?.addEventListener('click', () => {
      try {
        this.tournamentManager.startTournament();
        this.refresh();
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to start tournament');
      }
    });

    // Reset tournament
    document.getElementById('reset-tournament')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset the tournament? This cannot be undone.')) {
        this.tournamentManager.resetTournament();
        this.refresh();
      }
    });

    // Play match
    document.getElementById('play-match')?.addEventListener('click', (e) => {
      const matchId = (e.target as HTMLElement).dataset.matchId;
      if (matchId) {
        this.startMatch(matchId);
      }
    });

    // New tournament
    document.getElementById('new-tournament')?.addEventListener('click', () => {
      this.tournamentManager.resetTournament();
      this.refresh();
    });
  }

  private addPlayer(): void {
    const input = document.getElementById('player-alias') as HTMLInputElement;
    const alias = input?.value.trim();
    
    if (!alias) {
      alert('Please enter a player alias');
      return;
    }

    try {
      this.tournamentManager.registerPlayer(alias);
      input.value = '';
      this.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add player');
    }
  }

  private removePlayer(playerId: string): void {
    try {
      this.tournamentManager.removePlayer(playerId);
      this.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to remove player');
    }
  }

  private startMatch(matchId: string): void {
    try {
      const match = this.tournamentManager.startMatch(matchId);
      
      // Navigate to play page with match data
      const url = `/play?match=${matchId}&p1=${encodeURIComponent(match.player1.alias)}&p2=${encodeURIComponent(match.player2.alias)}`;
      window.history.pushState({}, '', url);
      
      // Dispatch custom event to trigger router navigation
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to start match');
    }
  }

  private refresh(): void {
    // Re-render the page
    const content = document.getElementById('content');
    if (content) {
      content.innerHTML = this.render();
    }
  }

  public cleanup(): void {
    // Cleanup when navigating away
  }
}