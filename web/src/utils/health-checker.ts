export class HealthChecker {
  private indicator: HTMLElement | null = null;
  private intervalId: number | null = null;

  start(): void {
    this.indicator = document.getElementById('health-indicator');
    if (this.indicator) {
      this.checkHealth();
      this.intervalId = window.setInterval(() => this.checkHealth(), 10000);
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkHealth(): Promise<void> {
    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        credentials: 'include'
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        this.updateStatus(true, `API Online`);
        console.log('Health check successful:', data);
      } else {
        this.updateStatus(false, `API Error: ${response.status}`);
        console.warn('Health check failed with status:', response.status);
      }
    } catch (error) {
      let errorMessage = 'API Offline';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'API Timeout';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Connection Failed';
        }
      }
      
      this.updateStatus(false, errorMessage);
      console.error('Health check failed:', error);
    }
  }

  private updateStatus(isOnline: boolean, message: string): void {
    if (!this.statusElement) return;

    this.statusElement.textContent = message;
    this.statusElement.className = isOnline ? 'status-online' : 'status-offline';
    
    // Update color based on status
    this.statusElement.style.color = isOnline ? '#10b981' : '#ef4444';
  }
}