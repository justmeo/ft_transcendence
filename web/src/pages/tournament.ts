import { Page } from '../router';
import { AuthService } from '../services/auth-service';

interface Tournament {
  id: number;
  name: string;
  type: string;
  status: string;
  creator_name?: string;
  participant_count: number;
  max_participants?: number;
  winner_name?: string;
  created_at: string;
}

export class TournamentPage implements Page {
  private authService: AuthService;
  private tournaments: Tournament[] = [];

  constructor() {
    this.authService = new AuthService();
  }

  render(): string {
    setTimeout(() => this.loadData(), 0);

    return `
      <div class="page">
        <h2>🏆 Tournaments</h2>
        <p style="margin-bottom: 2rem;">Compete against other players in organized tournaments</p>

        <div id="tournament-content">
          <div style="text-align: center; padding: 3rem;">
            <div style="color: var(--primary); font-size: 1.1rem;">Loading tournaments...</div>
          </div>
        </div>

        <style>
          .tournament-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid var(--border);
          }

          .tournament-list {
            display: grid;
            gap: 1.5rem;
          }

          .tournament-card {
            background: var(--bg-card);
            border: 2px solid var(--border);
            border-radius: 12px;
            padding: 2rem;
            transition: all 0.2s ease;
          }

          .tournament-card:hover {
            border-color: var(--secondary);
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          }

          .tournament-card-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 1.5rem;
          }

          .tournament-title {
            font-size: 1.4rem;
            font-weight: 700;
            color: var(--light);
            margin: 0 0 0.5rem 0;
          }

          .tournament-meta {
            font-size: 0.95rem;
            color: var(--text-muted);
            margin: 0;
          }

          .tournament-badge {
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .badge-registration {
            background: var(--success);
            color: var(--white);
          }

          .badge-active {
            background: var(--accent);
            color: var(--dark);
          }

          .badge-completed {
            background: var(--neutral);
            color: var(--text-muted);
          }

          .tournament-info {
            display: flex;
            gap: 2rem;
            margin-bottom: 1.5rem;
            padding: 1rem;
            background: var(--bg-darker);
            border-radius: 8px;
          }

          .info-item {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          .info-label {
            font-size: 0.875rem;
            color: var(--text-muted);
          }

          .info-value {
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--light);
          }

          .tournament-actions {
            display: flex;
            gap: 1rem;
          }

          .create-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .create-modal.active {
            display: flex;
          }

          .modal-content {
            background: var(--bg-card);
            border: 2px solid var(--border);
            border-radius: 12px;
            padding: 2.5rem;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
          }

          .modal-title {
            font-size: 1.8rem;
            font-weight: 700;
            margin: 0 0 1.5rem 0;
            color: var(--light);
          }

          .form-field {
            margin-bottom: 1.5rem;
          }

          .form-field label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: var(--light);
          }

          .form-field input,
          .form-field select {
            width: 100%;
            padding: 0.875rem 1.25rem;
            border: 2px solid var(--border);
            border-radius: 8px;
            background: var(--bg-darker);
            color: var(--light);
            font-size: 1rem;
            font-family: inherit;
            transition: all 0.2s ease;
          }

          .form-field input:focus,
          .form-field select:focus {
            outline: none;
            border-color: var(--secondary);
            box-shadow: 0 0 0 3px rgba(108, 156, 168, 0.2);
          }

          .form-actions {
            display: flex;
            gap: 1rem;
            margin-top: 2rem;
          }

          .empty-state {
            text-align: center;
            padding: 4rem 2rem;
            color: var(--text-muted);
          }

          .empty-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }

          .empty-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--light);
            margin-bottom: 0.5rem;
          }

          @media (max-width: 768px) {
            .tournament-card {
              padding: 1.5rem;
            }

            .tournament-info {
              flex-direction: column;
              gap: 1rem;
            }

            .tournament-actions {
              flex-direction: column;
            }
          }
        </style>
      </div>
    `;
  }

  private async loadData(): Promise<void> {
    try {
      const isAuthenticated = await this.authService.checkAuth();
      if (!isAuthenticated) {
        this.renderLoginRequired();
        return;
      }

      // For now, show empty state since tournaments aren't implemented yet
      this.renderTournaments([]);

    } catch (error) {
      console.error('Failed to load tournaments:', error);
      this.renderError('Failed to load tournaments');
    }
  }

  private renderLoginRequired(): void {
    const content = document.getElementById('tournament-content');
    if (!content) return;

    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔒</div>
        <h3 class="empty-title">Login Required</h3>
        <p style="margin-bottom: 2rem;">Please log in to participate in tournaments</p>
        <a href="/login" data-route class="btn">Go to Login</a>
      </div>
    `;
  }

  private renderError(message: string): void {
    const content = document.getElementById('tournament-content');
    if (!content) return;

    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <h3 class="empty-title">Error</h3>
        <p style="margin-bottom: 2rem;">${message}</p>
        <button onclick="window.location.reload()" class="btn">Try Again</button>
      </div>
    `;
  }

  private renderTournaments(tournaments: Tournament[]): void {
    const content = document.getElementById('tournament-content');
    if (!content) return;

    content.innerHTML = `
      <div class="tournament-header">
        <div>
          <h3 style="margin: 0 0 0.5rem 0; font-size: 1.3rem;">Active Tournaments</h3>
          <p style="margin: 0; color: var(--text-muted);">Join or create competitive tournaments</p>
        </div>
        <button class="btn" id="create-tournament-btn">Create Tournament</button>
      </div>

      ${tournaments.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">🏆</div>
          <h3 class="empty-title">No Tournaments Yet</h3>
          <p style="margin-bottom: 2rem;">Be the first to create a tournament and compete with other players!</p>
          <button class="btn" onclick="document.getElementById('create-tournament-btn').click()">
            Create Your First Tournament
          </button>
        </div>
      ` : `
        <div class="tournament-list">
          ${tournaments.map(t => this.renderTournamentCard(t)).join('')}
        </div>
      `}

      <!-- Create Modal -->
      <div class="create-modal" id="create-modal">
        <div class="modal-content">
          <h3 class="modal-title">Create New Tournament</h3>

          <form id="create-form">
            <div class="form-field">
              <label for="tournament-name">Tournament Name</label>
              <input
                type="text"
                id="tournament-name"
                required
                placeholder="Enter tournament name"
                maxlength="100"
              >
            </div>

            <div class="form-field">
              <label for="tournament-type">Tournament Type</label>
              <select id="tournament-type">
                <option value="single-elimination">Single Elimination</option>
                <option value="round-robin">Round Robin</option>
              </select>
            </div>

            <div class="form-field">
              <label for="max-participants">Max Participants (Optional)</label>
              <input
                type="number"
                id="max-participants"
                min="2"
                max="64"
                placeholder="Leave empty for unlimited"
              >
            </div>

            <div id="form-error" style="color: var(--primary); margin-bottom: 1rem; min-height: 1.5rem;"></div>

            <div class="form-actions">
              <button type="submit" class="btn" style="flex: 1;">Create Tournament</button>
              <button type="button" class="btn btn-secondary" id="cancel-btn" style="flex: 1;">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.initializeEventHandlers();
  }

  private renderTournamentCard(tournament: Tournament): string {
    const statusClass = `badge-${tournament.status}`;
    const canJoin = tournament.status === 'registration' &&
                   (!tournament.max_participants || tournament.participant_count < tournament.max_participants);

    return `
      <div class="tournament-card">
        <div class="tournament-card-header">
          <div>
            <h4 class="tournament-title">${this.escapeHtml(tournament.name)}</h4>
            <p class="tournament-meta">
              ${tournament.type === 'single-elimination' ? 'Single Elimination' : 'Round Robin'}
              ${tournament.creator_name ? ` • Created by ${this.escapeHtml(tournament.creator_name)}` : ''}
            </p>
          </div>
          <div class="tournament-badge ${statusClass}">
            ${tournament.status}
          </div>
        </div>

        <div class="tournament-info">
          <div class="info-item">
            <div class="info-label">Participants</div>
            <div class="info-value">
              ${tournament.participant_count}${tournament.max_participants ? `/${tournament.max_participants}` : ''}
            </div>
          </div>

          <div class="info-item">
            <div class="info-label">Status</div>
            <div class="info-value">${tournament.status.replace('-', ' ')}</div>
          </div>

          ${tournament.winner_name ? `
            <div class="info-item">
              <div class="info-label">Winner</div>
              <div class="info-value">${this.escapeHtml(tournament.winner_name)}</div>
            </div>
          ` : ''}
        </div>

        <div class="tournament-actions">
          ${canJoin ? '<button class="btn">Join Tournament</button>' : ''}
          <button class="btn btn-secondary">View Details</button>
        </div>
      </div>
    `;
  }

  private initializeEventHandlers(): void {
    const createBtn = document.getElementById('create-tournament-btn');
    const modal = document.getElementById('create-modal');
    const cancelBtn = document.getElementById('cancel-btn');
    const form = document.getElementById('create-form');

    createBtn?.addEventListener('click', () => {
      modal?.classList.add('active');
    });

    cancelBtn?.addEventListener('click', () => {
      modal?.classList.remove('active');
    });

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleCreateTournament();
    });
  }

  private async handleCreateTournament(): Promise<void> {
    const nameInput = document.getElementById('tournament-name') as HTMLInputElement;
    const typeSelect = document.getElementById('tournament-type') as HTMLSelectElement;
    const maxParticipantsInput = document.getElementById('max-participants') as HTMLInputElement;
    const errorDiv = document.getElementById('form-error');

    const name = nameInput.value.trim();
    if (!name) {
      if (errorDiv) errorDiv.textContent = 'Tournament name is required';
      return;
    }

    try {
      if (errorDiv) errorDiv.textContent = '';

      // TODO: Implement tournament creation API call
      alert('Tournament creation coming soon!');

      const modal = document.getElementById('create-modal');
      modal?.classList.remove('active');

    } catch (error) {
      if (errorDiv) {
        errorDiv.textContent = error instanceof Error ? error.message : 'Failed to create tournament';
      }
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  public cleanup(): void {
    // Cleanup when navigating away
  }
}
