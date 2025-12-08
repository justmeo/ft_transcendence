import { Component } from '../core/component';
import { BabylonHero } from '../utils/babylon-hero';

export class HomePage extends Component<Record<string, never>> {
  private heroScene?: BabylonHero;

  constructor() {
    super({});
  }

  render(): string {
    return `
      <div class="page">
        <section class="hero-section">
          <div class="hero-copy">
            <p class="eyebrow">Next-gen Pong</p>
            <h2>Welcome to ft_transcendence</h2>
            <p class="lead">
              Dive into our immersive arena where competitive multiplayer, live tournaments,
              and AI-driven training collide. Everything runs in real time inside your browser.
            </p>
            <div class="hero-actions">
              <a href="/play" data-route class="btn btn-accent">Launch Quick Match</a>
              <a href="/ai" data-route class="btn ghost">Train with AI</a>
            </div>
            <div class="hero-stats">
              <div>
                <span class="stat-value">5ms</span>
                <span class="stat-label">Input Latency</span>
              </div>
              <div>
                <span class="stat-value">120Hz</span>
                <span class="stat-label">Render Rate</span>
              </div>
              <div>
                <span class="stat-value">24/7</span>
                <span class="stat-label">Matchmaking</span>
              </div>
            </div>
          </div>
          <div class="hero-visual" id="babylon-hero"></div>
        </section>

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

          <div class="card">
            <h3>🧠 Babylon.js Arena</h3>
            <p>Experience our 3D arena concept rendered live in your browser with Babylon.js.</p>
            <a href="/play" data-route class="btn" style="margin-top: 1rem;">Explore Arena</a>
          </div>
        </div>
      </div>
    `;
  }

  mount(container: HTMLElement): void {
    const target = container.querySelector('#babylon-hero') as HTMLElement | null;
    if (!target) return;

    this.heroScene = new BabylonHero();
    this.heroScene.init(target);
  }

  cleanup(): void {
    this.heroScene?.dispose();
  }
}
