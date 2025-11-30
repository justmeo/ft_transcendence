import { Router } from './router';
import { HomePage } from './pages/home';
import { LoginPage } from './pages/login';
import { SignupPage } from './pages/signup';
import { PlayPage } from './pages/play';
import { AIPage } from './pages/ai-demo';
import { TournamentPage } from './pages/tournament';
import { ChatPage } from './pages/chat';
import { ProfilePage } from './pages/profile';
import { SettingsPage } from './pages/settings';
import { AuthService } from './services/auth-service';

// Define routes
const routes = {
  '/': HomePage,
  '/login': LoginPage,
  '/signup': SignupPage,
  '/play': PlayPage,
  '/ai': AIPage,
  '/tournament': TournamentPage,
  '/chat': ChatPage,
  '/profile': ProfilePage,
  '/settings': SettingsPage
};

// Initialize router and auth service
const router = new Router(routes);
const authService = new AuthService();

// Start the application
document.addEventListener('DOMContentLoaded', () => {
  router.start();
  initializeAuthAwareNav();

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

async function initializeAuthAwareNav() {
  await updateLoginNavState();

  window.addEventListener('auth:changed', (event) => {
    const customEvent = event as CustomEvent<{ authenticated: boolean }>;
    updateLoginNavDisplay(customEvent.detail?.authenticated ?? false);
  });
}

async function updateLoginNavState() {
  try {
    const isAuthenticated = await authService.checkAuth();
    updateLoginNavDisplay(isAuthenticated);
  } catch {
    updateLoginNavDisplay(false);
  }
}

function updateLoginNavDisplay(isAuthenticated: boolean) {
  const loginLink = document.querySelector('a[href="/login"][data-route]') as HTMLAnchorElement | null;
  if (!loginLink) return;

  if (isAuthenticated) {
    loginLink.setAttribute('aria-disabled', 'true');
    loginLink.textContent = 'Logged In';
    loginLink.title = 'Already logged in';
  } else {
    loginLink.removeAttribute('aria-disabled');
    loginLink.textContent = 'Login';
    loginLink.removeAttribute('title');
  }
}
