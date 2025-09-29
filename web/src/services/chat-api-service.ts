export interface ChatChannel {
  id: number;
  name: string;
  type: 'global' | 'dm' | 'tournament';
  other_user_name?: string;
  other_user_id?: number;
  tournament_name?: string;
  message_count: number;
  last_message?: string;
}

export interface ChatMessage {
  id: number;
  channel_id: number;
  user_id: number;
  display_name: string;
  avatar_url: string | null;
  message: string;
  message_type: 'text' | 'system' | 'match_invite';
  metadata: any;
  created_at: string;
}

export interface MatchInvite {
  id: number;
  from_user_id: number;
  to_user_id: number;
  from_user_name: string;
  to_user_name: string;
  from_user_avatar?: string;
  to_user_avatar?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  match_type: 'casual' | 'ranked';
  expires_at: string;
  created_at: string;
}

export interface BlockedUser {
  id: number;
  display_name: string;
  avatar_url: string | null;
  blocked_at: string;
}

export class ChatApiService {
  private baseUrl = '/api';

  // Get user's chat channels
  async getChannels(): Promise<ChatChannel[]> {
    const response = await fetch(`${this.baseUrl}/chat/channels`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch chat channels');
    }

    const data = await response.json();
    return data.channels;
  }

  // Get messages for a channel
  async getChannelMessages(channelId: number, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });

    const response = await fetch(`${this.baseUrl}/chat/channels/${channelId}/messages?${params}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }

    const data = await response.json();
    return data.messages;
  }

  // Send message to channel
  async sendMessage(channelId: number, message: string, messageType: string = 'text', metadata?: any): Promise<ChatMessage> {
    const response = await fetch(`${this.baseUrl}/chat/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ message, messageType, metadata })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send message');
    }

    return await response.json();
  }

  // Create or get DM channel
  async createDMChannel(userId: number): Promise<ChatChannel> {
    const response = await fetch(`${this.baseUrl}/chat/dm/${userId}`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create DM channel');
    }

    return await response.json();
  }

  // Block user
  async blockUser(userId: number): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/users/${userId}/block`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to block user');
    }

    return await response.json();
  }

  // Unblock user
  async unblockUser(userId: number): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/users/${userId}/block`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to unblock user');
    }

    return await response.json();
  }

  // Get blocked users
  async getBlockedUsers(): Promise<BlockedUser[]> {
    const response = await fetch(`${this.baseUrl}/profile/blocked-users`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch blocked users');
    }

    const data = await response.json();
    return data.blockedUsers;
  }

  // Create match invite
  async createMatchInvite(toUserId: number, matchType: string = 'casual'): Promise<MatchInvite> {
    const response = await fetch(`${this.baseUrl}/match-invites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ toUserId, matchType })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create match invite');
    }

    return await response.json();
  }

  // Respond to match invite
  async respondToInvite(inviteId: number, response: 'accepted' | 'declined'): Promise<{ message: string; invite: MatchInvite }> {
    const res = await fetch(`${this.baseUrl}/match-invites/${inviteId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ response })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to respond to invite');
    }

    return await res.json();
  }

  // Get user's invites
  async getInvites(): Promise<MatchInvite[]> {
    const response = await fetch(`${this.baseUrl}/match-invites`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch invites');
    }

    const data = await response.json();
    return data.invites;
  }

  // Search users
  async searchUsers(query: string, limit: number = 10): Promise<any[]> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString()
    });

    const response = await fetch(`${this.baseUrl}/users/search?${params}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to search users');
    }

    const data = await response.json();
    return data.users;
  }

  // Format message timestamp
  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  // Get channel display name
  getChannelDisplayName(channel: ChatChannel): string {
    switch (channel.type) {
      case 'global':
        return '🌍 Global Chat';
      case 'dm':
        return `💬 ${channel.other_user_name}`;
      case 'tournament':
        return `🏆 ${channel.tournament_name || channel.name}`;
      default:
        return channel.name;
    }
  }

  // Get message display style
  getMessageStyle(message: ChatMessage): string {
    switch (message.message_type) {
      case 'system':
        return 'system-message';
      case 'match_invite':
        return 'invite-message';
      default:
        return 'user-message';
    }
  }
}