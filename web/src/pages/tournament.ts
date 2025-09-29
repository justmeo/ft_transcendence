import { Page } from '../router';

export class TournamentPage implements Page {
  render(): string {
    return `
      <div class="page">
        <h2>🏆 Tournaments</h2>
        <p>Compete in organized tournaments and prove your skills!</p>
        
        <div style="margin-bottom: 2rem;">
          <h3>🔥 Active Tournaments</h3>
          <div class="cards">
            <div class="card">
              <h3>Weekly Championship</h3>
              <p>Prize Pool: 1000 pts | Players: 64/128</p>
              <div style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.8;">
                Registration closes in 2h 30m
              </div>
              <button style="margin-top: 1rem; padding: 0.5rem 1rem; background: rgba(40, 167, 69, 0.3); border: none; border-radius: 4px; color: white; cursor: pointer;">
                Join Tournament
              </button>
            </div>
            
            <div class="card">
              <h3>Beginner's Cup</h3>
              <p>Prize Pool: 250 pts | Players: 23/32</p>
              <div style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.8;">
                Starting in 45 minutes
              </div>
              <button style="margin-top: 1rem; padding: 0.5rem 1rem; background: rgba(40, 167, 69, 0.3); border: none; border-radius: 4px; color: white; cursor: pointer;">
                Join Tournament
              </button>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 2rem;">
          <h3>📅 Upcoming Tournaments</h3>
          <div class="cards">
            <div class="card">
              <h3>Grand Masters</h3>
              <p>Prize Pool: 5000 pts | Rating req: 1800+</p>
              <div style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.8;">
                Starts tomorrow at 8:00 PM
              </div>
              <button style="margin-top: 1rem; padding: 0.5rem 1rem; background: rgba(255, 193, 7, 0.3); border: none; border-radius: 4px; color: white; cursor: pointer;">
                Pre-register
              </button>
            </div>
            
            <div class="card">
              <h3>Friday Night Fight</h3>
              <p>Prize Pool: 750 pts | Open to all</p>
              <div style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.8;">
                Every Friday at 9:00 PM
              </div>
              <button style="margin-top: 1rem; padding: 0.5rem 1rem; background: rgba(255, 193, 7, 0.3); border: none; border-radius: 4px; color: white; cursor: pointer;">
                Set Reminder
              </button>
            </div>
          </div>
        </div>
        
        <div style="padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
          <h3>🎖️ Your Tournament History</h3>
          <div style="margin-top: 1rem;">
            <div style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
              <span>Winter Championship 2024</span>
              <span style="color: #28a745;">🥈 2nd Place</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
              <span>Speed Run Tournament</span>
              <span style="color: #ffc107;">🥉 3rd Place</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.5rem;">
              <span>Beginner's Cup #12</span>
              <span style="color: #ffd700;">🥇 1st Place</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}