import { Router } from './router';
import { HomePage } from './pages/home';
import { LoginPage } from './pages/login';
import { PlayPage } from './pages/play';
import { AIPage } from './pages/ai-demo';
import { TournamentPage } from './pages/tournament';
import { ChatPage } from './pages/chat';
import { ProfilePage } from './pages/profile';
import { SettingsPage } from './pages/settings';

// Define routes
const routes = {
  '/': HomePage,
  '/login': LoginPage,
  '/play': PlayPage,
  '/ai': AIPage,
  '/tournament': TournamentPage,
  '/chat': ChatPage,
  '/profile': ProfilePage,
  '/settings': SettingsPage
};

// Initialize router
const router = new Router(routes);

// Start the application
document.addEventListener('DOMContentLoaded', () => {
  router.start();
  
  // Health check functionality
  checkApiHealth();
  setInterval(checkApiHealth, 10000);
});

async function checkApiHealth() {
  const healthIndicator = document.getElementById('health-indicator');
  if (!healthIndicator) return;

  try {
    const response = await fetch('/api/health');
    if (response.ok) {
      healthIndicator.textContent = 'Online';
      healthIndicator.className = 'online';
    } else {
      throw new Error('API offline');
    }
  } catch (error) {
    healthIndicator.textContent = 'Offline';
    healthIndicator.className = 'offline';
  }
}