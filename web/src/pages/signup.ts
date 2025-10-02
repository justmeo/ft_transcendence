import { Page } from '../router';
import { AuthService } from '../services/auth-service';

export class SignupPage implements Page {
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
            <h2 style="text-align: center; margin-bottom: 2rem;">🚀 Join ft_transcendence</h2>
            
            <form id="signup-form">
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
                <label for="displayName" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Display Name:</label>
                <input 
                  type="text" 
                  id="displayName" 
                  name="displayName"
                  required
                  style="width: 100%; padding: 0.75rem;"
                  placeholder="Enter your display name"
                  maxlength="50"
                >
                <div id="displayName-error" class="error-message"></div>
                <small style="opacity: 0.7;">3-50 characters, letters, numbers, and underscores only</small>
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
                <small style="opacity: 0.7;">At least 6 characters with uppercase, lowercase, and number</small>
              </div>

              <div style="margin-bottom: 1.5rem;">
                <label for="confirmPassword" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Confirm Password:</label>
                <input 
                  type="password" 
                  id="confirmPassword" 
                  name="confirmPassword"
                  required
                  style="width: 100%; padding: 0.75rem;"
                  placeholder="Confirm your password"
                >
                <div id="confirmPassword-error" class="error-message"></div>
              </div>

              <div style="margin-bottom: 1.5rem;">
                <label for="avatarUrl" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Avatar URL (optional):</label>
                <input 
                  type="url" 
                  id="avatarUrl" 
                  name="avatarUrl"
                  style="width: 100%; padding: 0.75rem;"
                  placeholder="https://example.com/avatar.jpg"
                >
                <div id="avatarUrl-error" class="error-message"></div>
              </div>

              <div id="form-error" class="error-message" style="margin-bottom: 1rem;"></div>

              <button 
                type="submit" 
                id="signup-btn"
                class="btn" 
                style="width: 100%; margin-bottom: 1rem;">
                Create Account
              </button>
            </form>

            <div style="text-align: center; margin-top: 1.5rem;">
              <p style="margin-bottom: 0.5rem;">Already have an account?</p>
              <a href="/login" class="btn btn-secondary">Login</a>
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
          
          input.valid {
            border-color: var(--success) !important;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important;
          }
          
          .loading {
            opacity: 0.7;
            pointer-events: none;
          }

          small {
            display: block;
            margin-top: 0.25rem;
            font-size: 0.75rem;
          }
        </style>
      </div>
    `;
  }

  private initializeEventHandlers(): void {
    const form = document.getElementById('signup-form') as HTMLFormElement;
    const inputs = ['email', 'displayName', 'password', 'confirmPassword', 'avatarUrl'];

    // Add validation to all inputs
    inputs.forEach(inputId => {
      const input = document.getElementById(inputId) as HTMLInputElement;
      
      input.addEventListener('blur', () => {
        this.validateField(inputId, input.value);
      });

      input.addEventListener('input', () => {
        this.clearFieldError(inputId);
        // Re-validate confirm password when password changes
        if (inputId === 'password') {
          const confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement;
          if (confirmPasswordInput.value) {
            this.validateField('confirmPassword', confirmPasswordInput.value);
          }
        }
      });
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSignup();
    });
  }

  private validateField(field: string, value: string): boolean {
    let error: string | null = null;

    switch (field) {
      case 'email':
        error = this.authService.validateEmail(value);
        break;
      case 'displayName':
        error = this.authService.validateDisplayName(value);
        break;
      case 'password':
        error = this.authService.validatePassword(value);
        break;
      case 'confirmPassword':
        const passwordInput = document.getElementById('password') as HTMLInputElement;
        if (!value) {
          error = 'Please confirm your password';
        } else if (value !== passwordInput.value) {
          error = 'Passwords do not match';
        }
        break;
      case 'avatarUrl':
        if (value && !this.isValidUrl(value)) {
          error = 'Please enter a valid URL';
        }
        break;
    }

    this.showFieldError(field, error);
    return !error;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private showFieldError(field: string, error: string | null): void {
    const input = document.getElementById(field) as HTMLInputElement;
    const errorDiv = document.getElementById(`${field}-error`) as HTMLDivElement;

    if (error) {
      input.classList.remove('valid');
      input.classList.add('error');
      errorDiv.textContent = error;
    } else {
      input.classList.remove('error');
      if (input.value.trim()) {
        input.classList.add('valid');
      }
      errorDiv.textContent = '';
    }
  }

  private clearFieldError(field: string): void {
    const input = document.getElementById(field) as HTMLInputElement;
    const errorDiv = document.getElementById(`${field}-error`) as HTMLDivElement;

    input.classList.remove('error', 'valid');
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

  private async handleSignup(): Promise<void> {
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const displayNameInput = document.getElementById('displayName') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement;
    const avatarUrlInput = document.getElementById('avatarUrl') as HTMLInputElement;
    const signupBtn = document.getElementById('signup-btn') as HTMLButtonElement;
    const form = document.getElementById('signup-form') as HTMLFormElement;

    const email = emailInput.value.trim();
    const displayName = displayNameInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const avatarUrl = avatarUrlInput.value.trim() || undefined;

    // Clear previous errors
    this.clearFormError();

    // Validate all inputs
    const validations = [
      this.validateField('email', email),
      this.validateField('displayName', displayName),
      this.validateField('password', password),
      this.validateField('confirmPassword', confirmPassword),
      this.validateField('avatarUrl', avatarUrl || '')
    ];

    if (!validations.every(valid => valid)) {
      return;
    }

    // Show loading state
    form.classList.add('loading');
    signupBtn.textContent = 'Creating Account...';

    try {
      // Attempt signup
      await this.authService.signup(email, password, displayName, avatarUrl);

      // Success - redirect to home page
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));

    } catch (error) {
      // Show error message
      this.showFormError(error instanceof Error ? error.message : 'Signup failed');
    } finally {
      // Remove loading state
      form.classList.remove('loading');
      signupBtn.textContent = 'Create Account';
    }
  }

  public cleanup(): void {
    // Cleanup when navigating away
  }
}