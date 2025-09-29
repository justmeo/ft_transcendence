import { Page } from '../router';
import { TournamentApiService, Tournament, Match, Participant } from '../services/tournament-api-service';
import { AuthService } from '../services/auth-service';

export class TournamentPage implements Page {
  private tournamentService: TournamentApiService;
  private authService: AuthService;
  private currentTournament: Tournament | null = null;

  constructor() {
    this.tournamentService = new TournamentApiService();
    this.authService = new AuthService();
  }

  render(): string {
    setTimeout(() => this.loadData(), 0);

    return `
      <div class="max-w-7xl mx-auto px-4">
        <div id="tournament-content">
          <div class="text-center py-8">
            <div class="loading-spinner">Loading tournaments...</div>
          </div>
        </div>

        <style>
          .loading-spinner {
            color: var(--primary);
            font-size: 1.1rem;
          }
          
          .tournament-card {
            background: rgba(255, 255, 255, 0.05);
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .tournament-card:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: var(--primary);
          }
          
          .status-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
          }
          
          .status-registration {
            background: var(--success);
            color: white;
          }
          
          .status-active {
            background: var(--warning);
            color: black;
          }
          
          .status-completed {
            background: var(--text-muted);
            color: white;
          }
          
          .participant-list {
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            padding: 0.5rem;
          }
          
          .match-card {
            background: rgba(255, 255, 255, 0.03);
            padding: 1rem;
            border-radius: 6px;
            margin-bottom: 0.5rem;
            border-left: 3px solid var(--primary);
          }
        </style>
      </div>
    `;
  }

  private async loadData(): Promise<void> {
    const content = document.getElementById('tournament-content');
    if (!content) return;

    try {
      // Check authentication
      const isAuthenticated = await this.authService.checkAuth();
      if (!isAuthenticated) {
        this.renderLoginRequired();
        return;
      }

      // Load tournaments
      const tournamentsData = await this.tournamentService.listTournaments();
      this.renderTournamentsList(tournamentsData.tournaments);

    } catch (error) {
      this.renderError(error instanceof Error ? error.message : 'Failed to load tournaments');
    }
  }

  private renderLoginRequired(): void {
    const content = document.getElementById('tournament-content');
    if (!content) return;

    content.innerHTML = `
      <div style="text-align: center; padding: 3rem;">
        <h2>🔐 Authentication Required</h2>
        <p style="margin: 1rem 0;">Please log in to participate in tournaments.</p>
        <div style="margin-top: 2rem;">
          <a href="/login" class="btn" style="margin-right: 1rem;">Login</a>
          <a href="/signup" class="btn btn-secondary">Sign Up</a>
        </div>
      </div>
    `;
  }

  private renderError(message: string): void {
    const content = document.getElementById('tournament-content');
    if (!content) return;

    content.innerHTML = `
      <div style="text-align: center; padding: 3rem;">
        <h2>❌ Error</h2>
        <p style="color: var(--error); margin: 1rem 0;">${message}</p>
        <button onclick="window.location.reload()" class="btn">Retry</button>
      </div>
    `;
  }

  private renderTournamentsList(tournaments: Tournament[]): void {
    const content = document.getElementById('tournament-content');
    if (!content) return;

    content.innerHTML = `
      <h2 class="text-3xl font-bold mb-4">🏆 Tournaments</h2>
      <p class="text-text-muted mb-8">Create and join tournaments to compete against other players!</p>
      
      <div class="mb-8">
        <button id="create-tournament-btn" class="btn">Create New Tournament</button>
      </div>

      <div class="mb-8">
        <h3 class="text-2xl font-semibold mb-6">Active & Upcoming Tournaments</h3>
        <div id="tournaments-list" class="space-y-4">
          ${tournaments.length === 0 ? 
            '<div class="text-center py-8 text-text-muted">No tournaments available</div>' :
            tournaments.map(tournament => this.renderTournamentCard(tournament)).join('')
          }
        </div>
      </div>

      <!-- Create Tournament Modal -->
      <div id="create-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; align-items: center; justify-content: center;">
        <div class="card" style="max-width: 400px; margin: 2rem;">
          <h3>Create New Tournament</h3>
          
          <form id="create-form">
            <div style="margin: 1rem 0;">
              <label style="display: block; margin-bottom: 0.5rem;">Tournament Name:</label>
              <input type="text" id="tournament-name" required style="width: 100%; padding: 0.75rem;" placeholder="Enter tournament name" maxlength="255">
            </div>
            
            <div style="margin: 1rem 0;">
              <label style="display: block; margin-bottom: 0.5rem;">Tournament Type:</label>
              <select id="tournament-type" style="width: 100%; padding: 0.75rem;">
                <option value="single-elimination">Single Elimination</option>
                <option value="round-robin">Round Robin</option>
              </select>
            </div>
            
            <div style="margin: 1rem 0;">
              <label style="display: block; margin-bottom: 0.5rem;">Max Participants (optional):</label>
              <input type="number" id="max-participants" min="2" max="128" style="width: 100%; padding: 0.75rem;" placeholder="Leave empty for unlimited">
            </div>
            
            <div id="create-error" style="color: var(--error); margin: 1rem 0; min-height: 1.5rem;"></div>
            
            <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
              <button type="submit" class="btn" style="flex: 1;">Create</button>
              <button type="button" id="cancel-create" class="btn btn-secondary" style="flex: 1;">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.initializeEventHandlers();
  }

  private renderTournamentCard(tournament: Tournament): string {
    const statusClass = `status-${tournament.status}`;
    const canJoin = tournament.status === 'registration' && 
                   (!tournament.max_participants || tournament.participant_count < tournament.max_participants);

    return `
      <div class="tournament-card" data-tournament-id="${tournament.id}">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
          <div>
            <h4 style="margin: 0 0 0.5rem 0;">${tournament.name}</h4>
            <p style="margin: 0; opacity: 0.8; font-size: 0.9rem;">
              ${tournament.type === 'single-elimination' ? 'Single Elimination' : 'Round Robin'} • 
              Created by ${tournament.creator_name}
            </p>
          </div>
          <span class="status-badge ${statusClass}">${tournament.status.toUpperCase()}</span>
        </div>
        
        <div style="margin-bottom: 1rem;">
          <div style="font-size: 0.9rem; opacity: 0.8;">
            Participants: ${tournament.participant_count}${tournament.max_participants ? `/${tournament.max_participants}` : ''}
            ${tournament.winner_name ? `• Winner: ${tournament.winner_name}` : ''}
          </div>
        </div>
        
        <div style="display: flex; gap: 1rem; align-items: center;">
          <button onclick="tournamentPage.viewTournament(${tournament.id})" class="btn btn-secondary">
            View Details
          </button>
          ${canJoin ? `
            <button onclick="tournamentPage.joinTournament(${tournament.id})" class="btn">
              Join Tournament
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  private initializeEventHandlers(): void {
    const createBtn = document.getElementById('create-tournament-btn');
    const modal = document.getElementById('create-modal');
    const cancelBtn = document.getElementById('cancel-create');
    const form = document.getElementById('create-form');

    createBtn?.addEventListener('click', () => {
      if (modal) modal.style.display = 'flex';
    });

    cancelBtn?.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleCreateTournament();
    });

    // Close modal when clicking outside
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }

  private async handleCreateTournament(): Promise<void> {
    const nameInput = document.getElementById('tournament-name') as HTMLInputElement;
    const typeSelect = document.getElementById('tournament-type') as HTMLSelectElement;
    const maxParticipantsInput = document.getElementById('max-participants') as HTMLInputElement;
    const errorDiv = document.getElementById('create-error');
    const modal = document.getElementById('create-modal');

    const name = nameInput.value.trim();
    const type = typeSelect.value as 'single-elimination' | 'round-robin';
    const maxParticipants = maxParticipantsInput.value ? parseInt(maxParticipantsInput.value) : undefined;

    if (!name) {
      if (errorDiv) errorDiv.textContent = 'Tournament name is required';
      return;
    }

    try {
      if (errorDiv) errorDiv.textContent = '';
      
      await this.tournamentService.createTournament(name, type, maxParticipants);
      
      if (modal) modal.style.display = 'none';
      this.refresh();
      
    } catch (error) {
      if (errorDiv) {
        errorDiv.textContent = error instanceof Error ? error.message : 'Failed to create tournament';
      }
    }
  }

  // Methods exposed for onclick handlers
  async joinTournament(tournamentId: number): Promise<void> {
    try {
      await this.tournamentService.joinTournament(tournamentId);
      alert('Successfully joined tournament!');
      this.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to join tournament');
    }
  }

  async viewTournament(tournamentId: number): Promise<void> {
    // Navigate to tournament detail view
    window.history.pushState({}, '', `/tournament/${tournamentId}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  private refresh(): void {
    this.loadData();
  }

  public cleanup(): void {
    // Cleanup when navigating away
  }
}

// Make tournament page methods globally accessible
(window as any).tournamentPage = new TournamentPage();