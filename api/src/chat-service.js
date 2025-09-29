const database = require('./database');

class ChatService {
  constructor() {
    this.initializeGlobalChannel();
  }

  // Initialize global chat channel
  initializeGlobalChannel() {
    const globalChannel = database.queryOne(`
      SELECT id FROM chat_channels WHERE type = 'global' AND name = 'Global'
    `);

    if (!globalChannel) {
      database.execute(`
        INSERT INTO chat_channels (name, type, created_at)
        VALUES ('Global', 'global', CURRENT_TIMESTAMP)
      `);
    }
  }

  // Get or create DM channel between two users
  getOrCreateDMChannel(user1Id, user2Id) {
    // Ensure consistent ordering for DM channels
    const [smallerId, largerId] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

    let channel = database.queryOne(`
      SELECT c.*, 
             u1.display_name as participant1_name,
             u2.display_name as participant2_name
      FROM chat_channels c
      LEFT JOIN users u1 ON c.participant1_id = u1.id
      LEFT JOIN users u2 ON c.participant2_id = u2.id
      WHERE c.type = 'dm' 
        AND c.participant1_id = ? 
        AND c.participant2_id = ?
    `, [smallerId, largerId]);

    if (!channel) {
      // Create new DM channel
      const result = database.execute(`
        INSERT INTO chat_channels (name, type, participant1_id, participant2_id, created_at)
        VALUES (?, 'dm', ?, ?, CURRENT_TIMESTAMP)
      `, [`DM_${smallerId}_${largerId}`, smallerId, largerId]);

      channel = database.queryOne(`
        SELECT c.*, 
               u1.display_name as participant1_name,
               u2.display_name as participant2_name
        FROM chat_channels c
        LEFT JOIN users u1 ON c.participant1_id = u1.id
        LEFT JOIN users u2 ON c.participant2_id = u2.id
        WHERE c.id = ?
      `, [result.lastInsertRowid]);
    }

    return channel;
  }

  // Get user's accessible channels
  getUserChannels(userId) {
    // Check if user is blocked by anyone (affects global chat visibility)
    const isBlocked = database.queryOne(`
      SELECT COUNT(*) as count FROM user_blocks WHERE blocked_id = ?
    `, [userId]).count > 0;

    const channels = [];

    // Global channel (always accessible unless heavily moderated)
    const globalChannel = database.queryOne(`
      SELECT c.*, 
             (SELECT COUNT(*) FROM chat_messages WHERE channel_id = c.id) as message_count
      FROM chat_channels c 
      WHERE c.type = 'global' AND c.name = 'Global'
    `);
    if (globalChannel) {
      channels.push(globalChannel);
    }

    // User's DM channels
    const dmChannels = database.query(`
      SELECT c.*, 
             CASE 
               WHEN c.participant1_id = ? THEN u2.display_name
               ELSE u1.display_name
             END as other_user_name,
             CASE 
               WHEN c.participant1_id = ? THEN u2.id
               ELSE u1.id
             END as other_user_id,
             (SELECT COUNT(*) FROM chat_messages WHERE channel_id = c.id) as message_count,
             (SELECT message FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM chat_channels c
      JOIN users u1 ON c.participant1_id = u1.id
      JOIN users u2 ON c.participant2_id = u2.id
      WHERE c.type = 'dm' 
        AND (c.participant1_id = ? OR c.participant2_id = ?)
      ORDER BY c.id DESC
    `, [userId, userId, userId, userId]);

    channels.push(...dmChannels);

    // Tournament channels user is participating in
    const tournamentChannels = database.query(`
      SELECT c.*, t.name as tournament_name,
             (SELECT COUNT(*) FROM chat_messages WHERE channel_id = c.id) as message_count
      FROM chat_channels c
      JOIN tournaments t ON c.tournament_id = t.id
      JOIN participants p ON t.id = p.tournament_id
      WHERE c.type = 'tournament' AND p.user_id = ?
      ORDER BY t.created_at DESC
    `, [userId]);

    channels.push(...tournamentChannels);

    return channels;
  }

  // Send message to channel
  sendMessage(userId, channelId, message, messageType = 'text', metadata = null) {
    // Validate channel access
    if (!this.canUserAccessChannel(userId, channelId)) {
      throw new Error('Access denied to this channel');
    }

    // Check if message would be blocked
    if (this.isMessageBlocked(userId, channelId, message)) {
      throw new Error('Message blocked due to user blocking');
    }

    // Insert message
    const result = database.execute(`
      INSERT INTO chat_messages (channel_id, user_id, message, message_type, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [channelId, userId, message, messageType, metadata ? JSON.stringify(metadata) : null]);

    // Return message with user info
    return database.queryOne(`
      SELECT m.*, u.display_name, u.avatar_url
      FROM chat_messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `, [result.lastInsertRowid]);
  }

  // Get channel messages with pagination
  getChannelMessages(userId, channelId, limit = 50, offset = 0) {
    // Validate channel access
    if (!this.canUserAccessChannel(userId, channelId)) {
      throw new Error('Access denied to this channel');
    }

    // Get messages, filtering out blocked users
    const messages = database.query(`
      SELECT m.*, u.display_name, u.avatar_url
      FROM chat_messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.channel_id = ?
        AND m.user_id NOT IN (
          SELECT blocked_id FROM user_blocks WHERE blocker_id = ?
        )
        AND ? NOT IN (
          SELECT blocker_id FROM user_blocks WHERE blocked_id = m.user_id
        )
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [channelId, userId, userId, limit, offset]);

    return messages.reverse(); // Return in chronological order
  }

  // Check if user can access channel
  canUserAccessChannel(userId, channelId) {
    const channel = database.queryOne(`
      SELECT * FROM chat_channels WHERE id = ?
    `, [channelId]);

    if (!channel) return false;

    switch (channel.type) {
      case 'global':
        return true; // Global channels are accessible to all

      case 'dm':
        return channel.participant1_id === userId || channel.participant2_id === userId;

      case 'tournament':
        // Check if user is participant in tournament
        const isParticipant = database.queryOne(`
          SELECT COUNT(*) as count 
          FROM participants p 
          WHERE p.tournament_id = ? AND p.user_id = ?
        `, [channel.tournament_id, userId]);
        return isParticipant.count > 0;

      default:
        return false;
    }
  }

  // Check if message would be blocked
  isMessageBlocked(senderId, channelId, message) {
    const channel = database.queryOne(`
      SELECT * FROM chat_channels WHERE id = ?
    `, [channelId]);

    if (!channel) return true;

    // For DM channels, check if either user has blocked the other
    if (channel.type === 'dm') {
      const otherUserId = channel.participant1_id === senderId ? 
        channel.participant2_id : channel.participant1_id;

      const isBlocked = database.queryOne(`
        SELECT COUNT(*) as count FROM user_blocks 
        WHERE (blocker_id = ? AND blocked_id = ?) 
           OR (blocker_id = ? AND blocked_id = ?)
      `, [senderId, otherUserId, otherUserId, senderId]);

      return isBlocked.count > 0;
    }

    return false;
  }

  // Block user
  blockUser(blockerId, blockedId) {
    if (blockerId === blockedId) {
      throw new Error('Cannot block yourself');
    }

    // Check if already blocked
    const existing = database.queryOne(`
      SELECT id FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?
    `, [blockerId, blockedId]);

    if (existing) {
      throw new Error('User is already blocked');
    }

    // Insert block
    database.execute(`
      INSERT INTO user_blocks (blocker_id, blocked_id, created_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `, [blockerId, blockedId]);

    return { message: 'User blocked successfully' };
  }

  // Unblock user
  unblockUser(blockerId, blockedId) {
    const result = database.execute(`
      DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?
    `, [blockerId, blockedId]);

    if (result.changes === 0) {
      throw new Error('User was not blocked');
    }

    return { message: 'User unblocked successfully' };
  }

  // Get user's block list
  getBlockedUsers(userId) {
    return database.query(`
      SELECT u.id, u.display_name, u.avatar_url, b.created_at as blocked_at
      FROM user_blocks b
      JOIN users u ON b.blocked_id = u.id
      WHERE b.blocker_id = ?
      ORDER BY b.created_at DESC
    `, [userId]);
  }

  // Create match invite
  createMatchInvite(fromUserId, toUserId, matchType = 'casual') {
    // Check if users are blocking each other
    const isBlocked = database.queryOne(`
      SELECT COUNT(*) as count FROM user_blocks 
      WHERE (blocker_id = ? AND blocked_id = ?) 
         OR (blocker_id = ? AND blocked_id = ?)
    `, [fromUserId, toUserId, toUserId, fromUserId]);

    if (isBlocked.count > 0) {
      throw new Error('Cannot invite blocked user');
    }

    // Check for existing pending invite
    const existing = database.queryOne(`
      SELECT id FROM match_invites 
      WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'
        AND expires_at > CURRENT_TIMESTAMP
    `, [fromUserId, toUserId]);

    if (existing) {
      throw new Error('Pending invite already exists');
    }

    // Create invite (expires in 5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    
    const result = database.execute(`
      INSERT INTO match_invites (from_user_id, to_user_id, match_type, expires_at, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [fromUserId, toUserId, matchType, expiresAt]);

    return database.queryOne(`
      SELECT i.*, 
             u1.display_name as from_user_name,
             u2.display_name as to_user_name
      FROM match_invites i
      JOIN users u1 ON i.from_user_id = u1.id
      JOIN users u2 ON i.to_user_id = u2.id
      WHERE i.id = ?
    `, [result.lastInsertRowid]);
  }

  // Respond to match invite
  respondToMatchInvite(inviteId, userId, response) {
    const invite = database.queryOne(`
      SELECT * FROM match_invites WHERE id = ? AND to_user_id = ?
    `, [inviteId, userId]);

    if (!invite) {
      throw new Error('Invite not found');
    }

    if (invite.status !== 'pending') {
      throw new Error('Invite is no longer pending');
    }

    if (new Date(invite.expires_at) < new Date()) {
      // Mark as expired
      database.execute(`
        UPDATE match_invites SET status = 'expired' WHERE id = ?
      `, [inviteId]);
      throw new Error('Invite has expired');
    }

    // Update invite status
    database.execute(`
      UPDATE match_invites SET status = ? WHERE id = ?
    `, [response, inviteId]);

    return { message: `Invite ${response}`, invite };
  }

  // Get user's pending invites
  getUserInvites(userId) {
    return database.query(`
      SELECT i.*, 
             u1.display_name as from_user_name, u1.avatar_url as from_user_avatar,
             u2.display_name as to_user_name, u2.avatar_url as to_user_avatar
      FROM match_invites i
      JOIN users u1 ON i.from_user_id = u1.id
      JOIN users u2 ON i.to_user_id = u2.id
      WHERE (i.from_user_id = ? OR i.to_user_id = ?) 
        AND i.status = 'pending' 
        AND i.expires_at > CURRENT_TIMESTAMP
      ORDER BY i.created_at DESC
    `, [userId, userId]);
  }

  // Create tournament notification channel
  createTournamentChannel(tournamentId, tournamentName) {
    const channelName = `Tournament: ${tournamentName}`;
    
    const result = database.execute(`
      INSERT INTO chat_channels (name, type, tournament_id, created_at)
      VALUES (?, 'tournament', ?, CURRENT_TIMESTAMP)
    `, [channelName, tournamentId]);

    // Send welcome message
    this.sendSystemMessage(result.lastInsertRowid, 
      `Welcome to ${tournamentName} tournament chat!`);

    return result.lastInsertRowid;
  }

  // Send system message
  sendSystemMessage(channelId, message, metadata = null) {
    return database.execute(`
      INSERT INTO chat_messages (channel_id, user_id, message, message_type, metadata, created_at)
      VALUES (?, 1, ?, 'system', ?, CURRENT_TIMESTAMP)
    `, [channelId, message, metadata ? JSON.stringify(metadata) : null]);
  }

  // Notify tournament participants about next match
  notifyTournamentMatch(tournamentId, matchId, player1Name, player2Name) {
    const channel = database.queryOne(`
      SELECT id FROM chat_channels WHERE tournament_id = ? AND type = 'tournament'
    `, [tournamentId]);

    if (channel) {
      const message = `🎮 Next Match: ${player1Name} vs ${player2Name}`;
      const metadata = { matchId, type: 'match_notification' };
      
      this.sendSystemMessage(channel.id, message, metadata);
      return channel.id;
    }

    return null;
  }

  // Get online users (placeholder - would need WebSocket tracking)
  getOnlineUsers() {
    // In a real implementation, this would track WebSocket connections
    // For now, return users who have been active recently
    return database.query(`
      SELECT u.id, u.display_name, u.avatar_url
      FROM users u
      WHERE u.updated_at > datetime('now', '-30 minutes')
      ORDER BY u.display_name
    `);
  }

  // Search users for DM creation
  searchUsers(query, excludeUserId, limit = 10) {
    return database.query(`
      SELECT u.id, u.display_name, u.avatar_url
      FROM users u
      WHERE u.id != ? 
        AND u.display_name LIKE ?
        AND u.id NOT IN (
          SELECT blocked_id FROM user_blocks WHERE blocker_id = ?
        )
        AND ? NOT IN (
          SELECT blocker_id FROM user_blocks WHERE blocked_id = u.id
        )
      ORDER BY u.display_name
      LIMIT ?
    `, [excludeUserId, `%${query}%`, excludeUserId, excludeUserId, limit]);
  }
}

module.exports = new ChatService();