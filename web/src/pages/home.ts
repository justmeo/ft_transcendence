import { Page } from '../router';

export class HomePage implements Page {
  render(): string {
    return `
      <div class="page">
        <h2>Welcome to ft_transcendence</h2>
        <p>A modern gaming platform built with TypeScript and Docker.</p>
        
        <div class="cards">
          <div class="card">
            <h3>🎮 Play Games</h3>
            <p>Jump into quick matches and challenge other players online.</p>
          </div>
          
          <div class="card">
            <h3>🏆 Tournaments</h3>
            <p>Compete in organized tournaments and climb the leaderboards.</p>
          </div>
          
          <div class="card">
            <h3>⚙️ Customize</h3>
            <p>Personalize your gaming experience with custom settings.</p>
          </div>
        </div>
        
        <div style="margin-top: 2rem; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
          <h3>🚀 Development Status</h3>
          <p>This is a TypeScript SPA with client-side routing using the History API. 
             Navigation supports back/forward buttons and maintains proper browser history.</p>
        </div>
      </div>
    `;
  }
}