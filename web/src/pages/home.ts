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
            <a href="/play" data-route class="btn" style="margin-top: 1rem;">Start Playing</a>
          </div>

          <div class="card">
            <h3>🏆 Tournaments</h3>
            <p>Compete in organized tournaments and climb the leaderboards.</p>
            <a href="/tournament" data-route class="btn btn-accent" style="margin-top: 1rem;">View Tournaments</a>
          </div>

          <div class="card">
            <h3>💬 Chat</h3>
            <p>Connect with other players and make new friends.</p>
            <a href="/chat" data-route class="btn btn-secondary" style="margin-top: 1rem;">Join Chat</a>
          </div>
        </div>
      </div>
    `;
  }
}