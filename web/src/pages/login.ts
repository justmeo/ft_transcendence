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
      <div class="login-page">
        <div class="login-container">
          <div class="login-card">
            <h2 class="login-title">Welcome Back</h2>
            
            <form id="login-form" class="login-form">
              <div class="form-group">
                <label for="email" class="form-label">Email:</label>
                <input type="email" id="email" name="email" required class="form-input">
                <div id="email-error" class="error-message"></div>
              </div>
              
              <div class="form-group">
                <label for="password" class="form-label">Password:</label>
                <input type="password" id="password" name="password" required class="form-input">
                <div id="password-error" class="error-message"></div>
              </div>
              
              <div id="form-error" class="error-message form-error"></div>
              
              <button type="submit" class="login-btn">
                Sign In
              </button>
            </form>
            
            <div class="signup-link">
              <p class="signup-text">Don't have an account?</p>
              <a href="/signup" class="signup-btn" data-route>Create Account</a>
            </div>
          </div>
        </div>
        
        <style>
          .login-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          
          .login-container {
            width: 100%;
            max-width: 400px;
          }
          
          .login-card {
            background: white;
            border-radius: 16px;
            padding: 2rem;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
          }
          
          .login-title {
            text-align: center;
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 2rem;
            color: #1a202c;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          
          .login-form {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }
          
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .form-label {
            font-weight: 500;
            color: #374151;
            font-size: 0.875rem;
          }
          
          .form-input {
            padding: 0.875rem;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 1rem;
            transition: all 0.2s ease;
            background: #f9fafb;
          }
          
          .form-input:focus {
            outline: none;
            border-color: #667eea;
            background: white;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }
          
          .form-input.error {
            border-color: #ef4444;
            background: #fef2f2;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
          }
          
          .error-message {
            color: #ef4444;
            font-size: 0.875rem;
            margin-top: 0.25rem;
            min-height: 1.25rem;
            opacity: 0;
            transform: translateY(-4px);
            transition: all 0.2s ease;
          }
          
          .error-message:not(:empty) {
            opacity: 1;
            transform: translateY(0);
          }
          
          .form-error {
            margin-bottom: 1rem;
            text-align: center;
            font-weight: 500;
          }
          
          .login-btn {
            padding: 1rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-top: 0.5rem;
          }
          
          .login-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
          }
          
          .login-btn:active {
            transform: translateY(0);
          }
          
          .signup-link {
            text-align: center;
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid #e5e7eb;
          }
          
          .signup-text {
            color: #6b7280;
            margin-bottom: 1rem;
            font-size: 0.875rem;
          }
          
          .signup-btn {
            display: inline-block;
            padding: 0.75rem 2rem;
            background: transparent;
            color: #667eea;
            border: 2px solid #667eea;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.2s ease;
          }
          
          .signup-btn:hover {
            background: #667eea;
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
          }
          
          .login-form.loading {
            opacity: 0.7;
            pointer-events: none;
          }
          
          .login-form.loading .login-btn {
            background: #9ca3af;
            cursor: not-allowed;
          }
          
          @media (max-width: 480px) {
            .login-page {
              padding: 1rem;
            }
            
            .login-card {
              padding: 1.5rem;
            }
            
            .login-title {
              font-size: 1.75rem;
            }
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
    submitBtn.textContent = 'Logging in...';

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