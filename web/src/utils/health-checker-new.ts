export class HealthChecker {
  private statusElement: HTMLElement | null = null;
  private checkInterval: number | null = null;
  private readonly CHECK_INTERVAL = 15000; // 15 seconds
  private isDestroyed = false;

  constructor() {
    console.log('HealthChecker: Initializing...');
    this.initializeStatusElement();
    this.startHealthCheck();
  }

  private initializeStatusElement(): void {
    // Try to find existing element
    this.statusElement = document.getElementById('api-status');
    
    if (!this.statusElement) {
      console.log('HealthChecker: Creating status element');
      this.createStatusElement();
    } else {
      console.log('HealthChecker: Found existing status element');
    }
  }

  private createStatusElement(): void {
    console.log('HealthChecker: Creating floating status element');
    
    // Create floating status indicator
    const statusContainer = document.createElement('div');
    statusContainer.id = 'health-status-container';
    statusContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(10px);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      z-index: 9999;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
      cursor: pointer;
    `;
    
    const statusElement = document.createElement('span');
    statusElement.id = 'api-status';
    statusElement.textContent = 'API: Checking...';
    statusElement.style.color = '#fbbf24';
    
    // Add click handler for manual refresh
    statusContainer.addEventListener('click', () => {
      console.log('HealthChecker: Manual check triggered by click');
      this.manualCheck();
    });
    
    statusContainer.appendChild(statusElement);
    document.body.appendChild(statusContainer);
    
    this.statusElement = statusElement;
    console.log('HealthChecker: Floating status element created and added to DOM');
  }

  private async checkHealth(): Promise<void> {
    if (this.isDestroyed) return;
    
    console.log('HealthChecker: Checking API health...');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('HealthChecker: Request timeout');
        controller.abort();
      }, 8000);

      const startTime = Date.now();
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        credentials: 'include'
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      console.log(`HealthChecker: Response received in ${responseTime}ms, status: ${response.status}`);

      if (response.ok) {
        try {
          const data = await response.json();
          console.log('HealthChecker: API response:', data);
          this.updateStatus(true, `API: Online (${responseTime}ms)`);
        } catch (e) {
          console.log('HealthChecker: Response not JSON, treating as success');
          this.updateStatus(true, `API: Online (${responseTime}ms)`);
        }
      } else {
        console.warn(`HealthChecker: API returned ${response.status}: ${response.statusText}`);
        this.updateStatus(false, `API: Error ${response.status}`);
      }
    } catch (error) {
      let errorMessage = 'API: Offline';
      
      if (error instanceof Error) {
        console.error('HealthChecker: Error details:', error.message);
        
        if (error.name === 'AbortError') {
          errorMessage = 'API: Timeout';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'API: Connection Failed';
        } else if (error.message.includes('NetworkError')) {
          errorMessage = 'API: Network Error';
        }
      }
      
      console.error('HealthChecker: Health check failed:', error);
      this.updateStatus(false, errorMessage);
    }
  }

  private updateStatus(isOnline: boolean, message: string): void {
    if (!this.statusElement || this.isDestroyed) return;

    console.log(`HealthChecker: Updating status - ${isOnline ? 'ONLINE' : 'OFFLINE'}: ${message}`);
    
    this.statusElement.textContent = message;
    this.statusElement.style.color = isOnline ? '#10b981' : '#ef4444';
    
    // Add pulse animation for offline status
    if (!isOnline) {
      this.statusElement.style.animation = 'pulse 2s infinite';
    } else {
      this.statusElement.style.animation = 'none';
    }
  }

  private startHealthCheck(): void {
    console.log('HealthChecker: Starting periodic checks...');
    
    // Initial check with delay to ensure everything is loaded
    setTimeout(() => {
      this.checkHealth();
    }, 2000);
    
    // Set up periodic checks
    this.checkInterval = window.setInterval(() => {
      this.checkHealth();
    }, this.CHECK_INTERVAL);
  }

  public destroy(): void {
    console.log('HealthChecker: Destroying...');
    this.isDestroyed = true;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    // Remove status element if we created it
    if (this.statusElement && this.statusElement.parentElement) {
      this.statusElement.parentElement.remove();
    }
  }

  // Manual health check trigger for debugging
  public manualCheck(): void {
    console.log('HealthChecker: Manual check triggered');
    this.checkHealth();
  }
}