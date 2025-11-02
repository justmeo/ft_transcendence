import { Page } from '../router';
import { AuthService } from '../services/auth-service';

export class SettingsPage implements Page {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  render(): string {
    setTimeout(() => this.loadSettings(), 0);

    return `
      <div class="page">
        <h2>⚙️ Settings</h2>
        <p>Customize your account preferences.</p>

        <div id="settings-content">
          <div style="text-align: center; padding: 2rem;">
            <div class="loading">Loading settings...</div>
          </div>
        </div>

        <style>
          .loading {
            color: var(--primary);
            font-size: 1.1rem;
          }

          .settings-grid {
            display: grid;
            gap: 2rem;
            margin-top: 2rem;
          }

          .settings-form {
            margin-top: 1rem;
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

          .form-field input {
            width: 100%;
          }

          .success-message {
            background: var(--success);
            color: var(--white);
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            border: 2px solid var(--success);
          }

          .button-group {
            display: flex;
            gap: 1rem;
            margin-top: 2rem;
          }
        </style>
      </div>
    `;
  }

  private async loadSettings(): void {
    const content = document.getElementById('settings-content');
    if (!content) return;

    try {
      // Check authentication
      const isAuthenticated = await this.authService.checkAuth();
      if (!isAuthenticated) {
        content.innerHTML = `
          <div class="card">
            <h3>🔒 Login Required</h3>
            <p>Please login to access settings.</p>
            <a href="/login" data-route class="btn">Go to Login</a>
          </div>
        `;
        return;
      }

      // Load user profile
      const user = await this.authService.getProfile();
      this.renderSettings(user);
    } catch (error) {
      content.innerHTML = `
        <div class="error-message">
          Failed to load settings: ${error instanceof Error ? error.message : 'Unknown error'}
        </div>
      `;
    }
  }

  private renderSettings(user: any): void {
    const content = document.getElementById('settings-content');
    if (!content) return;

    content.innerHTML = `
      <div class="settings-grid">
        <div class="card">
          <h3>👤 Profile Settings</h3>
          <form id="profile-form" class="settings-form">
            <div id="success-message" style="display: none;" class="success-message">
              Profile updated successfully!
            </div>

            <div class="form-field">
              <label for="displayName">Display Name</label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value="${user.display_name || ''}"
                required
                minlength="3"
                maxlength="50"
              >
            </div>

            <div class="form-field">
              <label for="email">Email (Read-only)</label>
              <input
                type="email"
                id="email"
                value="${user.email || ''}"
                readonly
                style="opacity: 0.6; cursor: not-allowed;"
              >
              <small style="color: var(--text-muted); font-size: 0.85rem;">Email cannot be changed</small>
            </div>

            <div class="form-field">
              <label for="avatarUrl">Avatar URL (optional)</label>
              <input
                type="url"
                id="avatarUrl"
                name="avatarUrl"
                value="${user.avatar_url || ''}"
                placeholder="https://example.com/avatar.jpg"
              >
            </div>

            <div class="button-group">
              <button type="submit" class="btn">Save Changes</button>
              <button type="button" id="reset-btn" class="btn btn-secondary">Reset</button>
            </div>
          </form>
        </div>

        <div class="card">
          <h3>📊 Account Information</h3>
          <div style="margin-top: 1rem; line-height: 2;">
            <p><strong>User ID:</strong> ${user.id}</p>
            <p><strong>Member since:</strong> ${new Date(user.created_at).toLocaleDateString()}</p>
            <p><strong>Total Games:</strong> ${user.total_games || 0}</p>
            <p><strong>Wins:</strong> ${user.wins || 0}</p>
            <p><strong>Losses:</strong> ${user.losses || 0}</p>
            <p><strong>Rating:</strong> ${user.rating || 1000}</p>
          </div>
        </div>
      </div>
    `;

    // Attach event handlers
    setTimeout(() => this.attachEventHandlers(user), 0);
  }

  private attachEventHandlers(originalUser: any): void {
    const form = document.getElementById('profile-form') as HTMLFormElement;
    const resetBtn = document.getElementById('reset-btn');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSave();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const displayNameInput = document.getElementById('displayName') as HTMLInputElement;
        const avatarUrlInput = document.getElementById('avatarUrl') as HTMLInputElement;

        if (displayNameInput) displayNameInput.value = originalUser.display_name || '';
        if (avatarUrlInput) avatarUrlInput.value = originalUser.avatar_url || '';
      });
    }
  }

  private async handleSave(): Promise<void> {
    const displayNameInput = document.getElementById('displayName') as HTMLInputElement;
    const avatarUrlInput = document.getElementById('avatarUrl') as HTMLInputElement;
    const successMessage = document.getElementById('success-message');

    if (!displayNameInput) return;

    const displayName = displayNameInput.value.trim();
    const avatarUrl = avatarUrlInput?.value.trim();

    try {
      // Update profile via API
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          displayName,
          avatarUrl: avatarUrl || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      // Show success message
      if (successMessage) {
        successMessage.style.display = 'block';
        setTimeout(() => {
          successMessage.style.display = 'none';
        }, 3000);
      }
    } catch (error) {
      alert('Failed to save changes: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  public cleanup(): void {
    // Cleanup if needed
  }
}
