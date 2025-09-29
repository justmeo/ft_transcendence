import { Page } from '../router';
import { ChatApiService, ChatChannel, ChatMessage, MatchInvite } from '../services/chat-api-service';
import { AuthService } from '../services/auth-service';

export class ChatPage implements Page {
  private chatService: ChatApiService;
  private authService: AuthService;
  private currentChannel: ChatChannel | null = null;
  private refreshInterval: number | null = null;

  constructor() {
    this.chatService = new ChatApiService();
    this.authService = new AuthService();
  }

  render(): string {
    setTimeout(() => this.initializeChat(), 0);

    return `
      <div class="max-w-7xl mx-auto px-4">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-primary mb-2">💬 Chat</h1>
          <p class="text-text-muted text-lg">Connect with players, join tournaments, and challenge friends to matches</p>
        </div>
        
        <div class="flex h-[600px] bg-slate-900/50 border border-border-custom rounded-xl overflow-hidden shadow-2xl">
          <div class="w-80 bg-slate-800/60 border-r border-border-custom flex flex-col">
            <div class="p-6 border-b border-border-custom flex justify-between items-center bg-slate-800/80">
              <h3 class="text-xl font-semibold m-0 text-primary">Channels</h3>
              <button id="new-dm-btn" class="btn-small bg-primary hover:bg-primary/80 transition-colors">+ New DM</button>
            </div>
            
            <div class="flex-1 overflow-y-auto p-4" id="channels-list">
              <div class="loading-spinner text-center py-12 text-text-muted">
                <div class="animate-pulse">Loading channels...</div>
              </div>
            </div>

            <div class="p-4 border-t border-border-custom max-h-48 overflow-y-auto bg-slate-800/40">
              <h4 class="text-base font-semibold mb-3 m-0 text-warning flex items-center gap-2">
                <span>🎮</span> Match Invites
              </h4>
              <div id="invites-list"></div>
            </div>
          </div>

          <div class="flex-1 flex flex-col bg-gradient-to-b from-slate-900/30 to-slate-900/60">
            <div class="p-6 border-b border-border-custom bg-slate-800/60 font-medium" id="chat-room-header">
              <span class="text-text-muted">Select a channel to start chatting</span>
            </div>
            
            <div class="flex-1 overflow-y-auto p-6 flex flex-col" id="messages-container">
              <div class="text-center text-text-muted my-auto max-w-md mx-auto">
                <div class="mb-8">
                  <div class="text-6xl mb-4">💬</div>
                  <h3 class="text-2xl font-bold mb-4 text-white">Welcome to Chat!</h3>
                  <p class="text-lg leading-relaxed">Connect with players around the world. Join global discussions, start private conversations, or coordinate tournament matches.</p>
                </div>
                <div class="bg-slate-800/40 rounded-lg p-6 border border-border-custom">
                  <h4 class="text-primary font-semibold mb-2">Get Started:</h4>
                  <ul class="text-left space-y-2 text-text-muted">
                    <li>🌍 Join the Global channel for general chat</li>
                    <li>💬 Start a DM with another player</li>
                    <li>🏆 Tournament channels appear when you join</li>
                    <li>🎮 Send match invites directly from chat</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div class="p-6 border-t border-border-custom hidden bg-slate-800/40" id="message-input-container">
              <div class="flex gap-3">
                <input type="text" id="message-input" placeholder="Type your message..." maxlength="1000" class="flex-1 p-4 border border-border-custom rounded-lg bg-slate-900/50 text-text-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all">
                <button id="send-btn" class="btn px-8">Send</button>
              </div>
            </div>
          </div>
        </div>

        <!-- New DM Modal -->
        <div id="new-dm-modal" class="modal hidden">
          <div class="bg-slate-800 p-8 rounded-xl max-w-md w-11/12 border border-border-custom shadow-2xl">
            <h3 class="text-2xl font-bold mb-6 text-primary">💬 Start New Chat</h3>
            
            <div class="mb-6">
              <label class="block text-sm font-medium mb-2">Search for a player:</label>
              <input type="text" id="user-search" placeholder="Type username..." class="w-full p-4 border border-border-custom rounded-lg bg-slate-900/50 text-text-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all">
            </div>
            
            <div id="user-search-results" class="search-results mb-6"></div>
            
            <div class="flex gap-4">
              <button id="close-dm-modal" class="btn btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>

        <style>
          .channel-item {
            @apply p-4 mb-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-slate-700/60 border border-transparent hover:border-border-custom;
          }
          
          .channel-item.active {
            @apply bg-primary/90 text-white border-primary shadow-lg;
          }
          
          .message {
            @apply mb-6 p-4 rounded-xl max-w-4/5 shadow-sm;
          }
          
          .message.own {
            @apply self-end bg-gradient-to-r from-primary to-primary/80 text-white;
          }
          
          .message.other {
            @apply self-start bg-slate-800/60 border border-border-custom;
          }
          
          .message.system-message {
            @apply self-center bg-warning/20 text-warning text-center max-w-full italic border border-warning/30;
          }
          
          .message-header {
            @apply flex items-center mb-2 text-sm;
          }
          
          .message-header .username {
            @apply font-semibold mr-3 text-primary;
          }
          
          .message-header .timestamp {
            @apply opacity-60 text-xs bg-black/20 px-2 py-1 rounded-full;
          }
          
          .invite-item {
            @apply p-3 mb-3 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg border border-primary/30 text-sm;
          }
          
          .invite-actions {
            @apply mt-3 flex gap-2;
          }
          
          .modal {
            @apply fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50;
          }
          
          .search-results {
            @apply max-h-48 overflow-y-auto border border-border-custom rounded-lg bg-slate-900/50;
          }
          
          .user-result {
            @apply p-4 border-b border-border-custom cursor-pointer flex items-center gap-3 hover:bg-slate-800/60 last:border-b-0 transition-colors;
          }
          
          .user-result:hover {
            @apply bg-primary/10 border-primary/30;
          }

          @media (max-width: 768px) {
            .chat-container {
              @apply flex-col h-auto;
            }
            
            .chat-sidebar {
              @apply w-full h-64;
            }
          }
        </style>
      </div>
    `;
  }

  private async initializeChat(): Promise<void> {
    try {
      // Check authentication
      const isAuthenticated = await this.authService.checkAuth();
      if (!isAuthenticated) {
        this.renderLoginRequired();
        return;
      }

      // Load initial data
      await this.loadChannels();
      await this.loadInvites();

      // Set up event handlers
      this.setupEventHandlers();

      // Start refresh interval
      this.refreshInterval = window.setInterval(() => {
        this.refreshData();
      }, 5000); // Refresh every 5 seconds

    } catch (error) {
      console.error('Failed to initialize chat:', error);
      this.renderError(error instanceof Error ? error.message : 'Failed to load chat');
    }
  }

  private renderLoginRequired(): void {
    const container = document.querySelector('.flex.h-\\[600px\\]');
    if (container) {
      container.innerHTML = `
        <div class="flex items-center justify-center w-full">
          <div class="text-center max-w-md mx-auto p-8">
            <div class="text-6xl mb-6">🔐</div>
            <h2 class="text-3xl font-bold mb-4 text-white">Authentication Required</h2>
            <p class="text-text-muted text-lg mb-8 leading-relaxed">Please log in to access the chat system and connect with other players.</p>
            <div class="space-y-4">
              <a href="/login" class="btn w-full block text-center">Login to Chat</a>
              <a href="/signup" class="btn btn-secondary w-full block text-center">Create Account</a>
            </div>
          </div>
        </div>
      `;
    }
  }

  private renderError(message: string): void {
    const container = document.querySelector('.flex.h-\\[600px\\]');
    if (container) {
      container.innerHTML = `
        <div class="flex items-center justify-center w-full">
          <div class="text-center max-w-md mx-auto p-8">
            <div class="text-6xl mb-6">⚠️</div>
            <h2 class="text-2xl font-bold mb-4 text-error">Something went wrong</h2>
            <p class="text-text-muted text-lg mb-8 leading-relaxed">${message}</p>
            <button onclick="window.location.reload()" class="btn">Try Again</button>
          </div>
        </div>
      `;
    }
  }

  private async loadChannels(): Promise<void> {
    try {
      const channels = await this.chatService.getChannels();
      this.renderChannels(channels);
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  }

  private renderChannels(channels: ChatChannel[]): void {
    const channelsList = document.getElementById('channels-list');
    if (!channelsList) return;

    if (channels.length === 0) {
      channelsList.innerHTML = `
        <div class="text-center py-8 text-text-muted">
          <div class="text-4xl mb-3">📭</div>
          <p class="text-sm">No channels available</p>
        </div>
      `;
      return;
    }

    channelsList.innerHTML = channels.map(channel => `
      <div class="channel-item" data-channel-id="${channel.id}" onclick="chatPage.selectChannel(${channel.id})">
        <div class="font-semibold text-white">${this.chatService.getChannelDisplayName(channel)}</div>
        ${channel.last_message ? 
          `<div class="text-sm text-text-muted mt-1 truncate">${channel.last_message.substring(0, 40)}${channel.last_message.length > 40 ? '...' : ''}</div>` : 
          `<div class="text-xs text-text-muted/60 mt-1">No messages yet</div>`
        }
      </div>
    `).join('');
  }

  private async loadInvites(): Promise<void> {
    try {
      const invites = await this.chatService.getInvites();
      this.renderInvites(invites);
    } catch (error) {
      console.error('Failed to load invites:', error);
    }
  }

  private renderInvites(invites: MatchInvite[]): void {
    const invitesList = document.getElementById('invites-list');
    if (!invitesList) return;

    if (invites.length === 0) {
      invitesList.innerHTML = `
        <div class="text-center py-4 text-text-muted">
          <div class="text-2xl mb-2">🎯</div>
          <p class="text-xs">No pending invites</p>
        </div>
      `;
      return;
    }

    invitesList.innerHTML = invites.map(invite => `
      <div class="invite-item">
        <div class="font-medium mb-2">
          <span class="text-primary">${invite.from_user_name}</span> invited you to play 
          <span class="capitalize font-semibold">${invite.match_type}</span>
        </div>
        <div class="invite-actions">
          <button onclick="chatPage.respondToInvite(${invite.id}, 'accepted')" class="btn-small bg-success hover:bg-success/80 text-white">Accept</button>
          <button onclick="chatPage.respondToInvite(${invite.id}, 'declined')" class="btn-small bg-error hover:bg-error/80 text-white">Decline</button>
        </div>
      </div>
    `).join('');
  }

  private setupEventHandlers(): void {
    // New DM button
    const newDmBtn = document.getElementById('new-dm-btn');
    newDmBtn?.addEventListener('click', () => this.showNewDMModal());

    // Close DM modal
    const closeDmBtn = document.getElementById('close-dm-modal');
    closeDmBtn?.addEventListener('click', () => this.hideNewDMModal());

    // User search
    const userSearch = document.getElementById('user-search') as HTMLInputElement;
    userSearch?.addEventListener('input', () => this.searchUsers(userSearch.value));

    // Message input
    const messageInput = document.getElementById('message-input') as HTMLInputElement;
    const sendBtn = document.getElementById('send-btn');
    
    sendBtn?.addEventListener('click', () => this.sendMessage());
    messageInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }

  // Methods exposed for onclick handlers
  async selectChannel(channelId: number): Promise<void> {
    try {
      const channels = await this.chatService.getChannels();
      this.currentChannel = channels.find(c => c.id === channelId) || null;
      
      if (!this.currentChannel) return;

      // Update UI
      document.querySelectorAll('.channel-item').forEach(item => item.classList.remove('active'));
      document.querySelector(`[data-channel-id="${channelId}"]`)?.classList.add('active');

      // Load messages
      await this.loadMessages();

      // Show input
      const inputContainer = document.getElementById('message-input-container');
      if (inputContainer) inputContainer.style.display = 'block';

    } catch (error) {
      console.error('Failed to select channel:', error);
    }
  }

  async respondToInvite(inviteId: number, response: 'accepted' | 'declined'): Promise<void> {
    try {
      await this.chatService.respondToInvite(inviteId, response);
      
      if (response === 'accepted') {
        // Navigate to play page
        window.location.href = '/play?online=true';
      }
      
      // Refresh invites
      await this.loadInvites();
      
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to respond to invite');
    }
  }

  private async loadMessages(): Promise<void> {
    if (!this.currentChannel) return;

    try {
      const messages = await this.chatService.getChannelMessages(this.currentChannel.id);
      this.renderMessages(messages);
      
      // Update header
      const header = document.getElementById('chat-room-header');
      if (header) {
        header.innerHTML = `
          <span>${this.chatService.getChannelDisplayName(this.currentChannel)}</span>
          ${this.currentChannel.type === 'dm' ? 
            `<button onclick="chatPage.inviteToMatch(${this.currentChannel.other_user_id})" class="btn-small" style="margin-left: 1rem;">🎮 Invite to Pong</button>` : 
            ''
          }
        `;
      }

    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }

  private renderMessages(messages: ChatMessage[]): void {
    const container = document.getElementById('messages-container');
    if (!container) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    container.innerHTML = messages.map(message => {
      const isOwn = message.user_id === currentUser.id;
      const messageClass = this.chatService.getMessageStyle(message);
      
      return `
        <div class="message ${isOwn ? 'own' : 'other'} ${messageClass}">
          ${message.message_type !== 'system' ? `
            <div class="message-header">
              <span class="username">${message.display_name}</span>
              <span class="timestamp">${this.chatService.formatTimestamp(message.created_at)}</span>
            </div>
          ` : ''}
          <div>${message.message}</div>
        </div>
      `;
    }).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  private async sendMessage(): Promise<void> {
    const input = document.getElementById('message-input') as HTMLInputElement;
    if (!input || !this.currentChannel) return;

    const message = input.value.trim();
    if (!message) return;

    try {
      await this.chatService.sendMessage(this.currentChannel.id, message);
      input.value = '';
      
      // Reload messages
      await this.loadMessages();
      
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to send message');
    }
  }

  async inviteToMatch(userId: number): Promise<void> {
    try {
      await this.chatService.createMatchInvite(userId);
      alert('Match invite sent!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to send invite');
    }
  }

  private showNewDMModal(): void {
    const modal = document.getElementById('new-dm-modal');
    if (modal) modal.style.display = 'flex';
  }

  private hideNewDMModal(): void {
    const modal = document.getElementById('new-dm-modal');
    if (modal) modal.style.display = 'none';
  }

  private async searchUsers(query: string): Promise<void> {
    if (query.length < 2) {
      const results = document.getElementById('user-search-results');
      if (results) results.innerHTML = '';
      return;
    }

    try {
      const users = await this.chatService.searchUsers(query);
      this.renderUserSearchResults(users);
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  }

  private renderUserSearchResults(users: any[]): void {
    const results = document.getElementById('user-search-results');
    if (!results) return;

    if (users.length === 0) {
      results.innerHTML = '<div style="padding: 1rem; text-align: center; opacity: 0.7;">No users found</div>';
      return;
    }

    results.innerHTML = users.map(user => `
      <div class="user-result" onclick="chatPage.startDM(${user.id}, '${user.display_name}')">
        <div>
          <div style="font-weight: 500;">${user.display_name}</div>
        </div>
      </div>
    `).join('');
  }

  async startDM(userId: number, userName: string): Promise<void> {
    try {
      const channel = await this.chatService.createDMChannel(userId);
      this.hideNewDMModal();
      
      // Refresh channels and select the new one
      await this.loadChannels();
      await this.selectChannel(channel.id);
      
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to start DM');
    }
  }

  private async refreshData(): Promise<void> {
    try {
      await this.loadChannels();
      await this.loadInvites();
      
      // Refresh messages if channel is selected
      if (this.currentChannel) {
        await this.loadMessages();
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  }

  public cleanup(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

// Make chat page methods globally accessible
(window as any).chatPage = new ChatPage();