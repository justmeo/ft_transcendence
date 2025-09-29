export interface Page {
  render(): string;
  cleanup?(): void;
}

export interface Routes {
  [path: string]: new() => Page;
}

export class Router {
  private routes: Routes;
  private contentElement: HTMLElement;
  private currentPage: Page | null = null;

  constructor(routes: Routes) {
    this.routes = routes;
    this.contentElement = document.getElementById('content')!;
  }

  start(): void {
    // Handle navigation clicks
    document.addEventListener('click', this.handleLinkClick.bind(this));
    
    // Handle back/forward buttons
    window.addEventListener('popstate', this.handlePopState.bind(this));
    
    // Initial route
    this.navigate(window.location.pathname, false);
  }

  private handleLinkClick(event: Event): void {
    const target = event.target as HTMLElement;
    
    if (target.tagName === 'A' && target.hasAttribute('data-route')) {
      event.preventDefault();
      const href = target.getAttribute('href');
      if (href) {
        this.navigate(href);
      }
    }
  }

  private handlePopState(): void {
    this.navigate(window.location.pathname, false);
  }

  navigate(path: string, pushState: boolean = true): void {
    const PageClass = this.routes[path];
    
    if (!PageClass) {
      // Fallback to home page for unknown routes
      this.navigate('/', pushState);
      return;
    }

    // Cleanup current page
    if (this.currentPage && this.currentPage.cleanup) {
      this.currentPage.cleanup();
    }

    // Update browser history
    if (pushState) {
      window.history.pushState({}, '', path);
    }

    // Update active nav link
    this.updateActiveNavLink(path);

    // Render new page
    this.currentPage = new PageClass();
    this.contentElement.innerHTML = this.currentPage.render();
  }

  private updateActiveNavLink(currentPath: string): void {
    const links = document.querySelectorAll('.nav-links a[data-route]');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPath) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
}