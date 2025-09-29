import { Page } from '../router';

export class SettingsPage implements Page {
  render(): string {
    return `
      <div class="page">
        <h2>⚙️ Settings</h2>
        <p>Customize your gaming experience and account preferences.</p>
        
        <div style="display: grid; gap: 2rem; margin-top: 2rem;">
          <div class="card">
            <h3>🎮 Game Settings</h3>
            <div style="margin-top: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem;">
                <input type="checkbox" checked style="margin-right: 0.5rem;">
                Enable sound effects
              </label>
              <label style="display: block; margin-bottom: 0.5rem;">
                <input type="checkbox" checked style="margin-right: 0.5rem;">
                Show FPS counter
              </label>
              <label style="display: block; margin-bottom: 1rem;">
                <input type="checkbox" style="margin-right: 0.5rem;">
                Enable particle effects
              </label>
              
              <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem;">Game difficulty:</label>
                <select style="padding: 0.5rem; border-radius: 4px; border: none; background: rgba(255, 255, 255, 0.1); color: white;">
                  <option>Easy</option>
                  <option selected>Medium</option>
                  <option>Hard</option>
                  <option>Expert</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="card">
            <h3>👤 Profile Settings</h3>
            <div style="margin-top: 1rem;">
              <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem;">Username:</label>
                <input type="text" value="Player42" style="padding: 0.5rem; border-radius: 4px; border: none; background: rgba(255, 255, 255, 0.1); color: white; width: 100%;">
              </div>
              
              <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem;">Email:</label>
                <input type="email" value="player@ft.com" style="padding: 0.5rem; border-radius: 4px; border: none; background: rgba(255, 255, 255, 0.1); color: white; width: 100%;">
              </div>
              
              <label style="display: block; margin-bottom: 0.5rem;">
                <input type="checkbox" checked style="margin-right: 0.5rem;">
                Public profile
              </label>
              <label style="display: block; margin-bottom: 1rem;">
                <input type="checkbox" style="margin-right: 0.5rem;">
                Show online status
              </label>
            </div>
          </div>
          
          <div class="card">
            <h3>🔔 Notifications</h3>
            <div style="margin-top: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem;">
                <input type="checkbox" checked style="margin-right: 0.5rem;">
                Tournament announcements
              </label>
              <label style="display: block; margin-bottom: 0.5rem;">
                <input type="checkbox" checked style="margin-right: 0.5rem;">
                Friend requests
              </label>
              <label style="display: block; margin-bottom: 0.5rem;">
                <input type="checkbox" style="margin-right: 0.5rem;">
                Email notifications
              </label>
              <label style="display: block; margin-bottom: 1rem;">
                <input type="checkbox" style="margin-right: 0.5rem;">
                Match reminders
              </label>
            </div>
          </div>
          
          <div class="card">
            <h3>🎨 Appearance</h3>
            <div style="margin-top: 1rem;">
              <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem;">Theme:</label>
                <select style="padding: 0.5rem; border-radius: 4px; border: none; background: rgba(255, 255, 255, 0.1); color: white;">
                  <option selected>Dark (Default)</option>
                  <option>Light</option>
                  <option>Auto</option>
                </select>
              </div>
              
              <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem;">Language:</label>
                <select style="padding: 0.5rem; border-radius: 4px; border: none; background: rgba(255, 255, 255, 0.1); color: white;">
                  <option selected>English</option>
                  <option>Français</option>
                  <option>Español</option>
                  <option>Deutsch</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <div style="margin-top: 2rem; display: flex; gap: 1rem;">
          <button style="padding: 0.75rem 2rem; background: rgba(40, 167, 69, 0.3); border: none; border-radius: 4px; color: white; cursor: pointer;">
            Save Changes
          </button>
          <button style="padding: 0.75rem 2rem; background: rgba(255, 255, 255, 0.1); border: none; border-radius: 4px; color: white; cursor: pointer;">
            Reset to Defaults
          </button>
        </div>
      </div>
    `;
  }
}