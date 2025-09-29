import './tailwind.css';
import { Router } from './router';
import { HomePage } from './pages/home';
import { PlayPage } from './pages/play';
import { TournamentPage } from './pages/tournament-new';
import { SettingsPage } from './pages/settings';
import { LoginPage } from './pages/login';
import { SignupPage } from './pages/signup';
import { ProfilePage } from './pages/profile';
import { ChatPage } from './pages/chat';
import { AIPage } from './pages/ai-demo';
import { HealthChecker } from './utils/health-checker-new';

// Initialize router with routes
const router = new Router({
  '/': HomePage,
  '/play': PlayPage,
  '/ai': AIPage,
  '/tournament': TournamentPage,
  '/chat': ChatPage,
  '/settings': SettingsPage,
  '/login': LoginPage,
  '/signup': SignupPage,
  '/profile': ProfilePage,
});

// Initialize health checker
const healthChecker = new HealthChecker();


// Start the application
document.addEventListener('DOMContentLoaded', () => {
  router.start();
  healthChecker.start();
  
  console.log('ft_transcendence SPA initialized');
});