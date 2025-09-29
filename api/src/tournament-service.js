const database = require('./database');

class TournamentService {
  // Create new tournament
  createTournament(userId, { name, type, maxParticipants = null }) {
    if (!name || !type) {
      throw new Error('Tournament name and type are required');
    }

    if (!['single-elimination', 'round-robin'].includes(type)) {
      throw new Error('Invalid tournament type');
    }

    try {
      const result = database.execute(`
        INSERT INTO tournaments (name, type, max_participants, created_by, created_at) 
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [name, type, maxParticipants, userId]);

      return this.getTournamentById(result.lastInsertRowid);
    } catch (error) {
      throw new Error('Failed to create tournament');
    }
  }

  // Get tournament by ID with creator info
  getTournamentById(tournamentId) {
    const tournament = database.queryOne(`
      SELECT t.*, u.display_name as creator_name, 
             w.display_name as winner_name,
             COUNT(p.id) as participant_count
      FROM tournaments t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN users w ON t.winner_id = w.id
      LEFT JOIN participants p ON t.id = p.tournament_id
      WHERE t.id = ?
      GROUP BY t.id
    `, [tournamentId]);

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    return tournament;
  }

  // List all tournaments with filtering
  listTournaments({ status = null, limit = 20, offset = 0 } = {}) {
    let query = `
      SELECT t.*, u.display_name as creator_name,
             w.display_name as winner_name,
             COUNT(p.id) as participant_count
      FROM tournaments t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN users w ON t.winner_id = w.id
      LEFT JOIN participants p ON t.id = p.tournament_id
    `;
    
    const params = [];
    
    if (status) {
      query += ' WHERE t.status = ?';
      params.push(status);
    }
    
    query += ' GROUP BY t.id ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const tournaments = database.query(query, params);
    
    const totalQuery = status ? 
      'SELECT COUNT(*) as count FROM tournaments WHERE status = ?' :
      'SELECT COUNT(*) as count FROM tournaments';
    const totalParams = status ? [status] : [];
    const total = database.queryOne(totalQuery, totalParams).count;

    return { tournaments, total, limit, offset };
  }

  // Join tournament as participant
  joinTournament(tournamentId, userId) {
    const tournament = this.getTournamentById(tournamentId);
    
    if (tournament.status !== 'registration') {
      throw new Error('Tournament registration is closed');
    }

    if (tournament.max_participants && tournament.participant_count >= tournament.max_participants) {
      throw new Error('Tournament is full');
    }

    // Check if user already joined
    const existing = database.queryOne(`
      SELECT id FROM participants WHERE tournament_id = ? AND user_id = ?
    `, [tournamentId, userId]);

    if (existing) {
      throw new Error('Already joined this tournament');
    }

    try {
      database.execute(`
        INSERT INTO participants (tournament_id, user_id, joined_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `, [tournamentId, userId]);

      return { message: 'Successfully joined tournament' };
    } catch (error) {
      throw new Error('Failed to join tournament');
    }
  }

  // Get tournament participants
  getTournamentParticipants(tournamentId) {
    return database.query(`
      SELECT p.id as participant_id, p.joined_at, p.eliminated_at,
             u.id as user_id, u.display_name, u.avatar_url
      FROM participants p
      JOIN users u ON p.user_id = u.id
      WHERE p.tournament_id = ?
      ORDER BY p.joined_at ASC
    `, [tournamentId]);
  }

  // Start tournament and generate bracket
  startTournament(tournamentId, userId) {
    const tournament = this.getTournamentById(tournamentId);
    
    // Check permissions
    if (tournament.created_by !== userId) {
      throw new Error('Only tournament creator can start the tournament');
    }

    if (tournament.status !== 'registration') {
      throw new Error('Tournament cannot be started');
    }

    const participants = this.getTournamentParticipants(tournamentId);
    if (participants.length < 2) {
      throw new Error('Need at least 2 participants to start tournament');
    }

    // Start transaction
    const transaction = database.transaction(() => {
      // Update tournament status
      database.execute(`
        UPDATE tournaments 
        SET status = 'active', started_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [tournamentId]);

      // Generate matches based on tournament type
      if (tournament.type === 'single-elimination') {
        this.generateSingleEliminationMatches(tournamentId, participants);
      } else {
        this.generateRoundRobinMatches(tournamentId, participants);
      }
    });

    transaction();
    return { message: 'Tournament started successfully' };
  }

  // Generate single elimination matches
  generateSingleEliminationMatches(tournamentId, participants) {
    // Shuffle participants for fair seeding
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    
    // Add byes if needed to make power of 2
    while (shuffled.length & (shuffled.length - 1)) {
      shuffled.push(null); // null represents a bye
    }

    let round = 1;
    let currentParticipants = shuffled;

    // Generate first round matches
    for (let i = 0; i < currentParticipants.length; i += 2) {
      const player1 = currentParticipants[i];
      const player2 = currentParticipants[i + 1];

      // Skip if both are byes or one is bye (auto-advance)
      if (!player1 || !player2) continue;

      database.execute(`
        INSERT INTO matches (tournament_id, player1_id, player2_id, round_number, match_number, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [tournamentId, player1.user_id, player2.user_id, round, Math.floor(i / 2) + 1]);
    }
  }

  // Generate round robin matches
  generateRoundRobinMatches(tournamentId, participants) {
    let matchNumber = 1;
    
    // Generate all possible pairings
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        database.execute(`
          INSERT INTO matches (tournament_id, player1_id, player2_id, round_number, match_number, created_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [tournamentId, participants[i].user_id, participants[j].user_id, 1, matchNumber]);
        matchNumber++;
      }
    }
  }

  // Get tournament matches
  getTournamentMatches(tournamentId) {
    return database.query(`
      SELECT m.*, 
             p1.display_name as player1_name, p1.avatar_url as player1_avatar,
             p2.display_name as player2_name, p2.avatar_url as player2_avatar,
             w.display_name as winner_name
      FROM matches m
      JOIN users p1 ON m.player1_id = p1.id
      JOIN users p2 ON m.player2_id = p2.id
      LEFT JOIN users w ON m.winner_id = w.id
      WHERE m.tournament_id = ?
      ORDER BY m.round_number, m.match_number
    `, [tournamentId]);
  }

  // Record match result
  recordMatchResult(matchId, userId, { winnerId, player1Score, player2Score }) {
    const match = database.queryOne(`
      SELECT m.*, t.created_by, t.status as tournament_status
      FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = ?
    `, [matchId]);

    if (!match) {
      throw new Error('Match not found');
    }

    if (match.tournament_status !== 'active') {
      throw new Error('Tournament is not active');
    }

    if (match.status === 'completed') {
      throw new Error('Match already completed');
    }

    // Check if user can record result (tournament creator or participant)
    const canRecord = match.created_by === userId || 
                     match.player1_id === userId || 
                     match.player2_id === userId;

    if (!canRecord) {
      throw new Error('Not authorized to record this match result');
    }

    // Validate winner
    if (winnerId !== match.player1_id && winnerId !== match.player2_id) {
      throw new Error('Winner must be one of the match participants');
    }

    // Start transaction
    const transaction = database.transaction(() => {
      // Update match
      database.execute(`
        UPDATE matches 
        SET winner_id = ?, player1_score = ?, player2_score = ?, 
            status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [winnerId, player1Score, player2Score, matchId]);

      // Check if tournament is complete
      this.checkTournamentCompletion(match.tournament_id);
    });

    transaction();
    return { message: 'Match result recorded successfully' };
  }

  // Check if tournament is complete and generate results
  checkTournamentCompletion(tournamentId) {
    const tournament = this.getTournamentById(tournamentId);
    
    // Check if all matches are completed
    const pendingMatches = database.queryOne(`
      SELECT COUNT(*) as count FROM matches 
      WHERE tournament_id = ? AND status != 'completed'
    `, [tournamentId]);

    if (pendingMatches.count === 0) {
      // Tournament complete - generate results
      this.generateTournamentResults(tournamentId, tournament.type);
      
      // Update tournament status
      database.execute(`
        UPDATE tournaments 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [tournamentId]);
    }
  }

  // Generate final tournament results
  generateTournamentResults(tournamentId, tournamentType) {
    const participants = this.getTournamentParticipants(tournamentId);
    const matches = this.getTournamentMatches(tournamentId);

    // Calculate stats for each participant
    const stats = participants.map(participant => {
      const wins = matches.filter(m => m.winner_id === participant.user_id).length;
      const losses = matches.filter(m => 
        (m.player1_id === participant.user_id || m.player2_id === participant.user_id) &&
        m.winner_id !== participant.user_id && m.status === 'completed'
      ).length;
      
      const totalScore = matches.reduce((sum, m) => {
        if (m.player1_id === participant.user_id) return sum + (m.player1_score || 0);
        if (m.player2_id === participant.user_id) return sum + (m.player2_score || 0);
        return sum;
      }, 0);

      return {
        user_id: participant.user_id,
        wins,
        losses,
        totalScore,
        winRate: wins + losses > 0 ? wins / (wins + losses) : 0
      };
    });

    // Sort by wins (then by win rate, then by total score)
    stats.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.totalScore - a.totalScore;
    });

    // Clear existing results and insert new ones
    database.execute('DELETE FROM results WHERE tournament_id = ?', [tournamentId]);
    
    stats.forEach((stat, index) => {
      database.execute(`
        INSERT INTO results (tournament_id, user_id, final_position, wins, losses, total_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [tournamentId, stat.user_id, index + 1, stat.wins, stat.losses, stat.totalScore]);
    });

    // Set tournament winner
    if (stats.length > 0) {
      database.execute(`
        UPDATE tournaments SET winner_id = ? WHERE id = ?
      `, [stats[0].user_id, tournamentId]);
    }
  }

  // Get tournament results/standings
  getTournamentResults(tournamentId) {
    return database.query(`
      SELECT r.*, u.display_name, u.avatar_url
      FROM results r
      JOIN users u ON r.user_id = u.id
      WHERE r.tournament_id = ?
      ORDER BY r.final_position ASC
    `, [tournamentId]);
  }

  // Get user's tournament history
  getUserTournamentHistory(userId, { limit = 20, offset = 0 } = {}) {
    const tournaments = database.query(`
      SELECT t.*, u.display_name as creator_name,
             p.joined_at, r.final_position, r.wins, r.losses
      FROM tournaments t
      JOIN participants p ON t.id = p.tournament_id
      JOIN users u ON t.created_by = u.id
      LEFT JOIN results r ON t.id = r.tournament_id AND r.user_id = ?
      WHERE p.user_id = ?
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, userId, limit, offset]);

    const total = database.queryOne(`
      SELECT COUNT(*) as count FROM tournaments t
      JOIN participants p ON t.id = p.tournament_id
      WHERE p.user_id = ?
    `, [userId]).count;

    return { tournaments, total, limit, offset };
  }
}

module.exports = new TournamentService();