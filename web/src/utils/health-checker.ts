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
    if (!this.indicator) return;

    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      
      if (data.ok) {
        this.updateStatus('✅ Healthy', 'success');
      } else {
        this.updateStatus('❌ Error', 'error');
      }
    } catch (error) {
      this.updateStatus('❌ Offline', 'error');
    }
  }

  private updateStatus(text: string, status: 'loading' | 'success' | 'error'): void {
    if (!this.indicator) return;
    
    this.indicator.textContent = text;
    this.indicator.className = status;
  }
}