export interface User {
  id: number;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: string;
  rank: string;
  rating: number;
  longestWinStreak: number;
  favoriteOpponent: string | null;
}

export interface AuthError {
  error: string;
  message: string;
  statusCode: number;
}

export class AuthService {
  private baseUrl = '/api';
  private currentUser: User | null = null;

  // Sign up new user
  async signup(email: string, password: string, displayName: string, avatarUrl?: string): Promise<User> {
    const response = await fetch(`${this.baseUrl}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password, displayName, avatarUrl })
    });

    if (!response.ok) {
      const error: AuthError = await response.json();
      throw new Error(error.message || 'Signup failed');
    }

    const user = await response.json();
    this.currentUser = user;
    return user;
  }

  // Login user
  async login(email: string, password: string): Promise<User> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error: AuthError = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const user = await response.json();
    this.currentUser = user;
    return user;
  }

  // Logout user
  async logout(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });

    if (response.ok) {
      this.currentUser = null;
    }
  }

  // Get current user profile
  async getProfile(): Promise<User> {
    const response = await fetch(`${this.baseUrl}/profile`, {
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.currentUser = null;
        throw new Error('Not authenticated');
      }
      throw new Error('Failed to fetch profile');
    }

    const user = await response.json();
    this.currentUser = user;
    return user;
  }

  // Get user stats
  async getUserStats(): Promise<UserStats> {
    const response = await fetch(`${this.baseUrl}/profile/stats`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user stats');
    }

    return await response.json();
  }

  // Check if user is authenticated
  async checkAuth(): Promise<boolean> {
    try {
      await this.getProfile();
      return true;
    } catch {
      this.currentUser = null;
      return false;
    }
  }

  // Get current user (cached)
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Client-side validation
  validateEmail(email: string): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Invalid email format';
    return null;
  }

  validatePassword(password: string): string | null {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
    return null;
  }

  validateDisplayName(displayName: string): string | null {
    if (!displayName) return 'Display name is required';
    if (displayName.length < 3) return 'Display name must be at least 3 characters';
    if (displayName.length > 50) return 'Display name must be less than 50 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(displayName)) return 'Display name can only contain letters, numbers, and underscores';
    return null;
  }
}