import { Page } from '../router';
import { AuthService, User, UserStats } from '../services/auth-service';

export class ProfilePage implements Page {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  render(): string {
    setTimeout(() => this.loadProfileData(), 0);

    return `
      <div class="page">
        <div id="profile-content">
          <div style="text-align: center; padding: 2rem;">
            <div class="loading-spinner">Loading profile...</div>
          </div>
        </div>

        <style>
          .loading-spinner {
            color: var(--primary);
            font-size: 1.1rem;
          }
          
          .profile-header {
            text-align: center;
            margin-bottom: 2rem;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
          }
          
          .avatar {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            margin: 0 auto 1rem;
            background: var(--primary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
          }
          
          .stat-card {
            background: rgba(255, 255, 255, 0.05);
            padding: 1.5rem;
            border-radius: 8px;
            text-align: center;
          }
          
          .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: var(--primary);
            display: block;
            margin-bottom: 0.5rem;
          }
          
          .stat-label {
            font-size: 0.9rem;
            opacity: 0.8;
          }
          
          .rank-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            background: var(--warning);
            color: var(--bg-dark);
            border-radius: 20px;
            font-weight: 500;
            font-size: 0.875rem;
          }
        </style>
      </div>
    `;
  }

  private async loadProfileData(): void {
    const content = document.getElementById('profile-content');
    if (!content) return;

    try {
      // Check authentication
      const isAuthenticated = await this.authService.checkAuth();
      if (!isAuthenticated) {
        this.renderLoginRequired();
        return;
      }

      // Load profile and stats
      const [user, stats] = await Promise.all([
        this.authService.getProfile(),
        this.authService.getUserStats()
      ]);

      this.renderProfile(user, stats);

    } catch (error) {
      this.renderError(error instanceof Error ? error.message : 'Failed to load profile');
    }
  }

  private renderLoginRequired(): void {
    const content = document.getElementById('profile-content');
    if (!content) return;

    content.innerHTML = `
      <div style="text-align: center; padding: 3rem;">
        <h2>🔐 Authentication Required</h2>
        <p style="margin: 1rem 0;">Please log in to view your profile.</p>
        <div style="margin-top: 2rem;">
          <a href="/login" class="btn" style="margin-right: 1rem;">Login</a>
          <a href="/signup" class="btn btn-secondary">Sign Up</a>
        </div>
      </div>
    `;
  }

  private renderError(message: string): void {
    const content = document.getElementById('profile-content');
    if (!content) return;

    content.innerHTML = `
      <div style="text-align: center; padding: 3rem;">
        <h2>❌ Error</h2>
        <p style="color: var(--error); margin: 1rem 0;">${message}</p>
        <button onclick="window.location.reload()" class="btn">Retry</button>
      </div>
    `;
  }

  private renderProfile(user: User, stats: UserStats): void {
    const content = document.getElementById('profile-content');
    if (!content) return;

    const memberSince = new Date(user.created_at).toLocaleDateString();
    const avatarInitial = user.display_name.charAt(0).toUpperCase();

    content.innerHTML = `
      <div class="profile-header">
        <div class="avatar">
          ${user.avatar_url ? 
            `<img src="${user.avatar_url}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` :
            avatarInitial
          }
        </div>
        <h2>${user.display_name}</h2>
        <p style="opacity: 0.8; margin: 0.5rem 0;">${user.email}</p>
        <span class="rank-badge">${stats.rank}</span>
        <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 1rem;">Member since ${memberSince}</p>
        
        <div style="margin-top: 1.5rem;">
          <button onclick="authService.logout().then(() => window.location.href = '/')" class="btn btn-secondary">
            Logout
          </button>
        </div>
      </div>

      <div style="margin-bottom: 2rem;">
        <h3 style="margin-bottom: 1.5rem;">📊 Game Statistics</h3>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
          <div class="stat-card">
            <span class="stat-number">${stats.totalGames}</span>
            <div class="stat-label">Total Games</div>
          </div>
          
          <div class="stat-card">
            <span class="stat-number">${stats.wins}</span>
            <div class="stat-label">Wins</div>
          </div>
          
          <div class="stat-card">
            <span class="stat-number">${stats.losses}</span>
            <div class="stat-label">Losses</div>
          </div>
          
          <div class="stat-card">
            <span class="stat-number">${stats.winRate}%</span>
            <div class="stat-label">Win Rate</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div class="stat-card">
            <span class="stat-number">${stats.rating}</span>
            <div class="stat-label">Current Rating</div>
          </div>
          
          <div class="stat-card">
            <span class="stat-number">${stats.longestWinStreak}</span>
            <div class="stat-label">Longest Win Streak</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom: 1rem;">🏆 Achievements</h3>
        <div style="text-align: center; opacity: 0.6; padding: 2rem;">
          <p>No achievements yet!</p>
          <p style="font-size: 0.9rem;">Play some games to unlock achievements.</p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 2rem;">
        <a href="/play" class="btn">Play Pong</a>
        <a href="/tournament" class="btn btn-secondary" style="margin-left: 1rem;">Join Tournament</a>
      </div>
    `;

    // Make authService globally available for logout
    (window as any).authService = this.authService;
  }

  public cleanup(): void {
    // Cleanup when navigating away
    if ((window as any).authService) {
      delete (window as any).authService;
    }
  }
}