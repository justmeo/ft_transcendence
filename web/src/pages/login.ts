import { Page } from '../router';
import { AuthService } from '../services/auth-service';

export class LoginPage implements Page {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  render(): string {
    setTimeout(() => this.initializeEventHandlers(), 0);

    return `
      <div class="page">
        <div style="max-width: 400px; margin: 2rem auto;">
          <div class="card">
            <h2 style="text-align: center; margin-bottom: 2rem;">🎮 Login to ft_transcendence</h2>
            
            <form id="login-form">
              <div style="margin-bottom: 1.5rem;">
                <label for="email" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Email:</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email"
                  required
                  style="width: 100%; padding: 0.75rem;"
                  placeholder="Enter your email"
                >
                <div id="email-error" class="error-message"></div>
              </div>

              <div style="margin-bottom: 1.5rem;">
                <label for="password" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Password:</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password"
                  required
                  style="width: 100%; padding: 0.75rem;"
                  placeholder="Enter your password"
                >
                <div id="password-error" class="error-message"></div>
              </div>

              <div id="form-error" class="error-message" style="margin-bottom: 1rem;"></div>

              <button 
                type="submit" 
                id="login-btn"
                class="btn" 
                style="width: 100%; margin-bottom: 1rem;">
                Login
              </button>
            </form>

            <div style="text-align: center; margin-top: 1.5rem;">
              <p style="margin-bottom: 0.5rem;">Don't have an account?</p>
              <a href="/signup" class="btn btn-secondary">Create Account</a>
            </div>
          </div>
        </div>

        <style>
          .error-message {
            color: var(--error);
            font-size: 0.875rem;
            margin-top: 0.25rem;
            min-height: 1.25rem;
          }
          
          .error-message:empty {
            display: none;
          }
          
          input.error {
            border-color: var(--error) !important;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
          }
          
          .loading {
            opacity: 0.7;
            pointer-events: none;
          }
        </style>
      </div>
    `;
  }

  private initializeEventHandlers(): void {
    const form = document.getElementById('login-form') as HTMLFormElement;
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const loginBtn = document.getElementById('login-btn') as HTMLButtonElement;

    // Real-time validation
    emailInput.addEventListener('blur', () => {
      this.validateField('email', emailInput.value);
    });

    emailInput.addEventListener('input', () => {
      this.clearFieldError('email');
    });

    passwordInput.addEventListener('blur', () => {
      this.validateField('password', passwordInput.value);
    });

    passwordInput.addEventListener('input', () => {
      this.clearFieldError('password');
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleLogin();
    });
  }

  private validateField(field: string, value: string): boolean {
    let error: string | null = null;

    switch (field) {
      case 'email':
        error = this.authService.validateEmail(value);
        break;
      case 'password':
        if (!value) error = 'Password is required';
        break;
    }

    this.showFieldError(field, error);
    return !error;
  }

  private showFieldError(field: string, error: string | null): void {
    const input = document.getElementById(field) as HTMLInputElement;
    const errorDiv = document.getElementById(`${field}-error`) as HTMLDivElement;

    if (error) {
      input.classList.add('error');
      errorDiv.textContent = error;
    } else {
      input.classList.remove('error');
      errorDiv.textContent = '';
    }
  }

  private clearFieldError(field: string): void {
    const input = document.getElementById(field) as HTMLInputElement;
    const errorDiv = document.getElementById(`${field}-error`) as HTMLDivElement;

    input.classList.remove('error');
    errorDiv.textContent = '';
  }

  private showFormError(message: string): void {
    const errorDiv = document.getElementById('form-error') as HTMLDivElement;
    errorDiv.textContent = message;
  }

  private clearFormError(): void {
    const errorDiv = document.getElementById('form-error') as HTMLDivElement;
    errorDiv.textContent = '';
  }

  private async handleLogin(): Promise<void> {
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const loginBtn = document.getElementById('login-btn') as HTMLButtonElement;
    const form = document.getElementById('login-form') as HTMLFormElement;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Clear previous errors
    this.clearFormError();

    // Validate inputs
    const emailValid = this.validateField('email', email);
    const passwordValid = this.validateField('password', password);

    if (!emailValid || !passwordValid) {
      return;
    }

    // Show loading state
    form.classList.add('loading');
    loginBtn.textContent = 'Logging in...';

    try {
      // Attempt login
      await this.authService.login(email, password);

      // Success - redirect to home page
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));

    } catch (error) {
      // Show error message
      this.showFormError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      // Remove loading state
      form.classList.remove('loading');
      loginBtn.textContent = 'Login';
    }
  }

  public cleanup(): void {
    // Cleanup when navigating away
  }
}