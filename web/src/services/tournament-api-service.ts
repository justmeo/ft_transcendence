export interface Tournament {
  id: number;
  name: string;
  type: 'single-elimination' | 'round-robin';
  status: 'registration' | 'active' | 'completed';
  max_participants: number | null;
  participant_count: number;
  created_by: number;
  creator_name: string;
  winner_id: number | null;
  winner_name: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface Participant {
  participant_id: number;
  user_id: number;
  display_name: string;
  avatar_url: string | null;
  joined_at: string;
  eliminated_at: string | null;
}

export interface Match {
  id: number;
  tournament_id: number;
  player1_id: number;
  player2_id: number;
  winner_id: number | null;
  player1_score: number;
  player2_score: number;
  round_number: number;
  match_number: number;
  status: 'pending' | 'in_progress' | 'completed';
  started_at: string | null;
  completed_at: string | null;
  player1_name: string;
  player2_name: string;
  winner_name: string | null;
}

export interface TournamentResult {
  id: number;
  tournament_id: number;
  user_id: number;
  final_position: number;
  wins: number;
  losses: number;
  total_score: number;
  display_name: string;
  avatar_url: string | null;
}

export class TournamentApiService {
  private baseUrl = '/api';

  // Create new tournament
  async createTournament(name: string, type: 'single-elimination' | 'round-robin', maxParticipants?: number): Promise<Tournament> {
    const response = await fetch(`${this.baseUrl}/tournaments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ name, type, maxParticipants })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create tournament');
    }

    return await response.json();
  }

  // List tournaments with filtering
  async listTournaments(status?: string, limit: number = 20, offset: number = 0): Promise<{
    tournaments: Tournament[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });
    
    if (status) {
      params.append('status', status);
    }

    const response = await fetch(`${this.baseUrl}/tournaments?${params}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tournaments');
    }

    return await response.json();
  }

  // Get tournament by ID
  async getTournament(tournamentId: number): Promise<Tournament> {
    const response = await fetch(`${this.baseUrl}/tournaments/${tournamentId}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Tournament not found');
    }

    return await response.json();
  }

  // Join tournament
  async joinTournament(tournamentId: number): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/tournaments/${tournamentId}/join`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to join tournament');
    }

    return await response.json();
  }

  // Start tournament
  async startTournament(tournamentId: number): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/tournaments/${tournamentId}/start`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to start tournament');
    }

    return await response.json();
  }

  // Get tournament participants
  async getTournamentParticipants(tournamentId: number): Promise<Participant[]> {
    const response = await fetch(`${this.baseUrl}/tournaments/${tournamentId}/participants`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch participants');
    }

    const data = await response.json();
    return data.participants;
  }

  // Get tournament matches
  async getTournamentMatches(tournamentId: number): Promise<Match[]> {
    const response = await fetch(`${this.baseUrl}/tournaments/${tournamentId}/matches`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch matches');
    }

    const data = await response.json();
    return data.matches;
  }

  // Get tournament results
  async getTournamentResults(tournamentId: number): Promise<TournamentResult[]> {
    const response = await fetch(`${this.baseUrl}/tournaments/${tournamentId}/results`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch results');
    }

    const data = await response.json();
    return data.results;
  }

  // Record match result
  async recordMatchResult(matchId: number, winnerId: number, player1Score: number, player2Score: number): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/matches/${matchId}/result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ winnerId, player1Score, player2Score })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to record match result');
    }

    return await response.json();
  }

  // Get user's tournament history
  async getUserTournamentHistory(limit: number = 20, offset: number = 0): Promise<{
    tournaments: any[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });

    const response = await fetch(`${this.baseUrl}/profile/tournaments?${params}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tournament history');
    }

    return await response.json();
  }

  // Helper method to get current match for a tournament
  getCurrentMatch(matches: Match[]): Match | null {
    return matches.find(match => match.status === 'pending') || null;
  }

  // Helper method to get upcoming matches
  getUpcomingMatches(matches: Match[], limit: number = 5): Match[] {
    return matches
      .filter(match => match.status === 'pending')
      .slice(0, limit);
  }

  // Helper method to get completed matches
  getCompletedMatches(matches: Match[]): Match[] {
    return matches
      .filter(match => match.status === 'completed')
      .reverse(); // Most recent first
  }
}