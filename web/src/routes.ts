import { HomePage } from './pages/home';
import { LoginPage } from './pages/login';
import { SignupPage } from './pages/signup';
import { PlayPage } from './pages/play';
import { AIPage } from './pages/ai-demo';
import { TournamentPage } from './pages/tournament';
import { ChatPage } from './pages/chat';
import { ProfilePage } from './pages/profile';
import { SettingsPage } from './pages/settings';
import { Routes } from './router';

export const routes: Routes = {
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
