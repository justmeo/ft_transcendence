import { Router } from './router';
import { HomePage } from './pages/home';
import { PlayPage } from './pages/play';
import { TournamentPage } from './pages/tournament';
import { SettingsPage } from './pages/settings';
import { HealthChecker } from './utils/health-checker';

// Initialize router with routes
const router = new Router({
  '/': HomePage,
  '/play': PlayPage,
  '/tournament': TournamentPage,
  '/settings': SettingsPage,
});

// Initialize health checker
const healthChecker = new HealthChecker();


// Start the application
document.addEventListener('DOMContentLoaded', () => {
  router.start();
  healthChecker.start();
  
  console.log('ft_transcendence SPA initialized');
});