import { Router } from '../router';
import { routes } from '../routes';
import { AuthService } from '../services/auth-service';
import { Store } from './store';

type AuthState = {
  authenticated: boolean;
};

const authService = new AuthService();
const authStore = new Store<AuthState>({ authenticated: false });

export function initApp(): void {
  const router = new Router(routes);

  document.addEventListener('DOMContentLoaded', () => {
    router.start();
    initializeNav();
    initializeHealth();
  });
}

function initializeNav(): void {
  // React to auth changes
  authStore.subscribe(({ authenticated }) => updateLoginNavDisplay(authenticated));

  // Initial auth check
  authService
    .checkAuth()
    .then((ok) => authStore.set({ authenticated: ok }))
    .catch(() => authStore.set({ authenticated: false }));

  // Listen for service-emitted events
  window.addEventListener('auth:changed', (event) => {
    const customEvent = event as CustomEvent<{ authenticated: boolean }>;
    authStore.set({ authenticated: customEvent.detail?.authenticated ?? false });
  });
}

function updateLoginNavDisplay(isAuthenticated: boolean): void {
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

function initializeHealth(): void {
  checkApiHealth();
  setInterval(checkApiHealth, 10000);
}

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
  } catch {
    healthIndicator.textContent = 'Offline';
    healthIndicator.className = 'offline';
  }
}
