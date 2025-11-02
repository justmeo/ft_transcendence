import { Page } from '../router';
import { AuthService } from '../services/auth-service';

interface Channel {
  id: number;
  name: string;
  type: string;
  display_name?: string;
  last_message?: string;
  other_user_id?: number;
}

interface Message {
  id: number;
  user_id: number;
  display_name: string;
  message: string;
  created_at: string;
}

export class ChatPage implements Page {
  private authService: AuthService;
  private currentChannel: Channel | null = null;
  private currentUser: any = null;
  private refreshInterval: number | null = null;

  constructor() {
    this.authService = new AuthService();
  }

  render(): string {
    setTimeout(() => this.initializeChat(), 0);

    return `
      <div class="page">
        <h2>💬 Chat</h2>
        <p style="margin-bottom: 2rem;">Connect with other players</p>

        <div id="chat-container">
          <div style="text-align: center; padding: 3rem;">
            <div style="color: var(--primary); font-size: 1.1rem;">Loading chat...</div>
          </div>
        </div>

        <style>
          .chat-layout {
            display: flex;
            gap: 0;
            height: 600px;
            background: var(--bg-card);
            border: 2px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
          }

          .chat-sidebar {
            width: 280px;
            background: var(--bg-darker);
            border-right: 2px solid var(--border);
            display: flex;
            flex-direction: column;
          }

          .chat-sidebar-header {
            padding: 1.5rem;
            border-bottom: 2px solid var(--border);
            font-weight: 600;
            font-size: 1.1rem;
            color: var(--light);
          }

          .channels-list {
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
          }

          .channel-item {
            padding: 1rem;
            margin-bottom: 0.5rem;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            border: 2px solid transparent;
          }

          .channel-item:hover {
            background: var(--bg-card);
            border-color: var(--border);
          }

          .channel-item.active {
            background: var(--primary);
            color: var(--white);
            border-color: var(--primary);
          }

          .channel-name {
            font-weight: 600;
            margin-bottom: 0.25rem;
          }

          .channel-preview {
            font-size: 0.875rem;
            opacity: 0.7;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .chat-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: var(--neutral);
          }

          .chat-header {
            padding: 1.5rem;
            border-bottom: 2px solid var(--border);
            font-weight: 600;
            font-size: 1.1rem;
            color: var(--light);
            background: var(--bg-darker);
          }

          .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 2rem;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }

          .chat-welcome {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            text-align: center;
            color: var(--text-muted);
          }

          .chat-welcome-content {
            max-width: 400px;
          }

          .chat-welcome h3 {
            color: var(--light);
            margin-bottom: 1rem;
            font-size: 1.5rem;
          }

          .message-bubble {
            display: flex;
            flex-direction: column;
            max-width: 70%;
            padding: 1rem 1.25rem;
            border-radius: 12px;
            line-height: 1.6;
          }

          .message-bubble.own {
            align-self: flex-end;
            background: var(--primary);
            color: var(--white);
          }

          .message-bubble.other {
            align-self: flex-start;
            background: var(--bg-card);
            color: var(--light);
            border: 2px solid var(--border);
          }

          .message-meta {
            display: flex;
            gap: 0.75rem;
            margin-bottom: 0.5rem;
            font-size: 0.875rem;
          }

          .message-author {
            font-weight: 600;
          }

          .message-time {
            opacity: 0.6;
          }

          .message-text {
            word-wrap: break-word;
          }

          .chat-input-container {
            padding: 1.5rem;
            border-top: 2px solid var(--border);
            background: var(--bg-darker);
          }

          .chat-input-wrapper {
            display: flex;
            gap: 1rem;
            align-items: center;
          }

          .chat-input {
            flex: 1;
            padding: 0.875rem 1.25rem;
            border: 2px solid var(--border);
            border-radius: 8px;
            background: var(--bg-card);
            color: var(--light);
            font-size: 1rem;
            font-family: inherit;
            transition: all 0.2s ease;
          }

          .chat-input:focus {
            outline: none;
            border-color: var(--secondary);
            box-shadow: 0 0 0 3px rgba(108, 156, 168, 0.2);
          }

          .chat-input::placeholder {
            color: var(--text-muted);
            opacity: 0.6;
          }

          @media (max-width: 768px) {
            .chat-layout {
              height: 500px;
            }

            .chat-sidebar {
              width: 220px;
            }

            .message-bubble {
              max-width: 85%;
            }
          }
        </style>
      </div>
    `;
  }

  private async initializeChat(): Promise<void> {
    try {
      const isAuthenticated = await this.authService.checkAuth();
      if (!isAuthenticated) {
        this.renderLoginRequired();
        return;
      }

      this.currentUser = await this.authService.getProfile();
      await this.loadChannels();

      // Refresh messages every 3 seconds
      this.refreshInterval = window.setInterval(() => {
        if (this.currentChannel) {
          this.loadMessages();
        }
      }, 3000);

    } catch (error) {
      console.error('Failed to initialize chat:', error);
      this.renderError('Failed to load chat');
    }
  }

  private renderLoginRequired(): void {
    const container = document.getElementById('chat-container');
    if (!container) return;

    container.innerHTML = `
      <div style="text-align: center; padding: 3rem;">
        <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">🔒 Login Required</h3>
        <p style="color: var(--text-muted); margin-bottom: 2rem;">Please log in to access chat</p>
        <a href="/login" data-route class="btn">Go to Login</a>
      </div>
    `;
  }

  private renderError(message: string): void {
    const container = document.getElementById('chat-container');
    if (!container) return;

    container.innerHTML = `
      <div style="text-align: center; padding: 3rem;">
        <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: var(--primary);">❌ Error</h3>
        <p style="color: var(--text-muted); margin-bottom: 2rem;">${message}</p>
        <button onclick="window.location.reload()" class="btn">Try Again</button>
      </div>
    `;
  }

  private async loadChannels(): Promise<void> {
    try {
      const response = await fetch('/api/chat/channels', {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to load channels');

      const data = await response.json();
      this.renderChatLayout(data.channels || []);

    } catch (error) {
      console.error('Failed to load channels:', error);
      this.renderError('Failed to load channels');
    }
  }

  private renderChatLayout(channels: Channel[]): void {
    const container = document.getElementById('chat-container');
    if (!container) return;

    container.innerHTML = `
      <div class="chat-layout">
        <div class="chat-sidebar">
          <div class="chat-sidebar-header">Channels</div>
          <div class="channels-list" id="channels-list">
            ${channels.length === 0 ?
              '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No channels yet</div>' :
              channels.map(channel => `
                <div class="channel-item" data-channel-id="${channel.id}">
                  <div class="channel-name">${this.escapeHtml(channel.display_name || channel.name || 'Channel')}</div>
                  ${channel.last_message ?
                    `<div class="channel-preview">${this.escapeHtml(channel.last_message)}</div>` :
                    '<div class="channel-preview" style="opacity: 0.5;">No messages yet</div>'
                  }
                </div>
              `).join('')
            }
          </div>
        </div>

        <div class="chat-main">
          <div class="chat-header" id="chat-header">
            <span style="color: var(--text-muted);">Select a channel to start chatting</span>
          </div>

          <div class="chat-messages" id="chat-messages">
            <div class="chat-welcome">
              <div class="chat-welcome-content">
                <div style="font-size: 3rem; margin-bottom: 1rem;">💬</div>
                <h3>Welcome to Chat</h3>
                <p>Select a channel from the sidebar to start messaging with other players</p>
              </div>
            </div>
          </div>

          <div class="chat-input-container" id="chat-input-container" style="display: none;">
            <div class="chat-input-wrapper">
              <input
                type="text"
                class="chat-input"
                id="message-input"
                placeholder="Type a message..."
                maxlength="1000"
              >
              <button class="btn" id="send-btn">Send</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Attach event handlers
    channels.forEach(channel => {
      const channelItem = document.querySelector(`[data-channel-id="${channel.id}"]`);
      channelItem?.addEventListener('click', () => this.selectChannel(channel));
    });

    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input') as HTMLInputElement;

    sendBtn?.addEventListener('click', () => this.sendMessage());
    messageInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }

  private async selectChannel(channel: Channel): Promise<void> {
    this.currentChannel = channel;

    // Update UI
    document.querySelectorAll('.channel-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-channel-id="${channel.id}"]`)?.classList.add('active');

    // Update header
    const header = document.getElementById('chat-header');
    if (header) {
      header.innerHTML = `<span>${this.escapeHtml(channel.display_name || channel.name || 'Channel')}</span>`;
    }

    // Show input
    const inputContainer = document.getElementById('chat-input-container');
    if (inputContainer) {
      inputContainer.style.display = 'block';
    }

    // Load messages
    await this.loadMessages();
  }

  private async loadMessages(): Promise<void> {
    if (!this.currentChannel) return;

    try {
      const response = await fetch(`/api/chat/channels/${this.currentChannel.id}/messages`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to load messages');

      const data = await response.json();
      this.renderMessages(data.messages || []);

    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }

  private renderMessages(messages: Message[]): void {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    if (messages.length === 0) {
      container.innerHTML = `
        <div class="chat-welcome">
          <div class="chat-welcome-content">
            <div style="font-size: 2rem; margin-bottom: 1rem;">📝</div>
            <p>No messages yet. Start the conversation!</p>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = messages.map(message => {
      const isOwn = message.user_id === this.currentUser?.id;
      const time = new Date(message.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div class="message-bubble ${isOwn ? 'own' : 'other'}">
          ${!isOwn ? `
            <div class="message-meta">
              <span class="message-author">${this.escapeHtml(message.display_name)}</span>
              <span class="message-time">${time}</span>
            </div>
          ` : `
            <div class="message-meta" style="justify-content: flex-end;">
              <span class="message-time">${time}</span>
            </div>
          `}
          <div class="message-text">${this.escapeHtml(message.message)}</div>
        </div>
      `;
    }).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  private async sendMessage(): Promise<void> {
    if (!this.currentChannel) return;

    const input = document.getElementById('message-input') as HTMLInputElement;
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    try {
      const response = await fetch(`/api/chat/channels/${this.currentChannel.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ message })
      });

      if (!response.ok) throw new Error('Failed to send message');

      input.value = '';
      await this.loadMessages();

    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  public cleanup(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}
