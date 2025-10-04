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
      <div class="main-content">
        <div class="page">
          <div class="login-container">
            <h2>Welcome Back</h2>
            <p>Sign in to your ft_transcendence account</p>
            
            <form id="login-form" class="login-form">
              <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required placeholder="Enter your email">
                <div id="email-error" class="error-message"></div>
              </div>
              
              <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required placeholder="Enter your password">
                <div id="password-error" class="error-message"></div>
              </div>
              
              <div id="form-error" class="error-message form-error"></div>
              
              <button type="submit" class="btn login-btn">
                Sign In
              </button>
            </form>
            
            <div class="signup-link">
              <p>Don't have an account?</p>
              <a href="/signup" class="btn btn-secondary" data-route>Create Account</a>
            </div>
          </div>
        </div>
        
        <style>
          .login-container {
            max-width: 420px;
            margin: 0 auto;
            text-align: center;
          }
          
          .login-form {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            margin: 2rem 0;
            text-align: left;
          }
          
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .form-group label {
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.95rem;
          }
          
          .error-message {
            color: var(--error);
            font-size: 0.875rem;
            min-height: 1.25rem;
            opacity: 0;
            transform: translateY(-4px);
            transition: all 0.3s ease;
          }
          
          .error-message:not(:empty) {
            opacity: 1;
            transform: translateY(0);
          }
          
          .form-error {
            text-align: center;
            font-weight: 500;
            margin-bottom: 1rem;
          }
          
          .login-btn {
            margin-top: 0.5rem;
            width: 100%;
            justify-content: center;
          }
          
          .signup-link {
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid var(--border);
          }
          
          .signup-link p {
            color: var(--text-secondary);
            margin-bottom: 1rem;
            font-size: 0.95rem;
          }
          
          .login-form.loading {
            opacity: 0.7;
            pointer-events: none;
          }
          
          .login-form.loading .login-btn {
            background: var(--neutral);
            cursor: not-allowed;
            box-shadow: none;
          }
          
          input.error {
            border-color: var(--error);
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
          }
        </style>
      </div>
    `;
  }

  private initializeEventHandlers(): void {
    const form = document.getElementById('login-form') as HTMLFormElement;
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;

    if (!form || !emailInput || !passwordInput) return;

    // Real-time validation
    emailInput.addEventListener('blur', () => {
      const error = this.authService.validateEmail(emailInput.value);
      this.showFieldError('email', error);
    });

    emailInput.addEventListener('input', () => {
      this.clearFieldError('email');
      this.clearFormError();
    });

    passwordInput.addEventListener('input', () => {
      this.clearFieldError('password');
      this.clearFormError();
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
    return error === null;
  }

  private showFieldError(field: string, error: string | null): void {
    const errorElement = document.getElementById(`${field}-error`);
    const inputElement = document.getElementById(field) as HTMLInputElement;

    if (errorElement && inputElement) {
      if (error) {
        errorElement.textContent = error;
        inputElement.classList.add('error');
      } else {
        errorElement.textContent = '';
        inputElement.classList.remove('error');
      }
    }
  }

  private clearFieldError(field: string): void {
    this.showFieldError(field, null);
  }

  private showFormError(message: string): void {
    const errorElement = document.getElementById('form-error');
    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  private clearFormError(): void {
    this.showFormError('');
  }

  private async handleLogin(): Promise<void> {
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const submitBtn = document.querySelector('.login-btn') as HTMLButtonElement;
    const form = document.getElementById('login-form') as HTMLFormElement;

    if (!emailInput || !passwordInput || !submitBtn || !form) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Validate fields
    const isEmailValid = this.validateField('email', email);
    const isPasswordValid = this.validateField('password', password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    // Show loading state
    form.classList.add('loading');
    submitBtn.textContent = 'Signing in...';

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
      submitBtn.textContent = 'Sign In';
    }
  }

  public cleanup(): void {
    // Cleanup if needed
  }
}