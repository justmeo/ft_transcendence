export interface Player {
  id: string;
  alias: string;
  wins: number;
  losses: number;
}

export interface Match {
  id: string;
  player1: Player;
  player2: Player;
  winner?: Player;
  player1Score?: number;
  player2Score?: number;
  status: 'pending' | 'playing' | 'completed';
  round?: number;
}

export interface Tournament {
  id: string;
  name: string;
  type: 'round-robin' | 'single-elimination';
  players: Player[];
  matches: Match[];
  currentMatch?: Match;
  status: 'registration' | 'active' | 'completed';
  winner?: Player;
  createdAt: string;
}

export class TournamentManager {
  private currentTournament: Tournament | null = null;
  private storageKey = 'ft_transcendence_tournament';

  constructor() {
    this.loadTournament();
  }

  // Tournament Management
  createTournament(name: string, type: 'round-robin' | 'single-elimination'): Tournament {
    this.currentTournament = {
      id: this.generateId(),
      name,
      type,
      players: [],
      matches: [],
      status: 'registration',
      createdAt: new Date().toISOString()
    };
    this.saveTournament();
    return this.currentTournament;
  }

  getCurrentTournament(): Tournament | null {
    return this.currentTournament;
  }

  resetTournament(): void {
    this.currentTournament = null;
    localStorage.removeItem(this.storageKey);
  }

  // Player Registration
  registerPlayer(alias: string): Player {
    if (!this.currentTournament) {
      throw new Error('No active tournament');
    }

    if (this.currentTournament.status !== 'registration') {
      throw new Error('Tournament registration is closed');
    }

    // Check for duplicate aliases
    if (this.currentTournament.players.some(p => p.alias.toLowerCase() === alias.toLowerCase())) {
      throw new Error('Alias already registered');
    }

    const player: Player = {
      id: this.generateId(),
      alias: alias.trim(),
      wins: 0,
      losses: 0
    };

    this.currentTournament.players.push(player);
    this.saveTournament();
    return player;
  }

  removePlayer(playerId: string): void {
    if (!this.currentTournament || this.currentTournament.status !== 'registration') {
      throw new Error('Cannot remove player at this time');
    }

    this.currentTournament.players = this.currentTournament.players.filter(p => p.id !== playerId);
    this.saveTournament();
  }

  getPlayersList(): Player[] {
    return this.currentTournament?.players || [];
  }

  // Tournament Generation
  startTournament(): void {
    if (!this.currentTournament) {
      throw new Error('No tournament to start');
    }

    if (this.currentTournament.players.length < 2) {
      throw new Error('Need at least 2 players to start tournament');
    }

    this.currentTournament.status = 'active';
    
    if (this.currentTournament.type === 'round-robin') {
      this.generateRoundRobinMatches();
    } else {
      this.generateSingleEliminationMatches();
    }

    this.setCurrentMatch();
    this.saveTournament();
  }

  private generateRoundRobinMatches(): void {
    if (!this.currentTournament) return;

    const players = this.currentTournament.players;
    const matches: Match[] = [];

    // Generate all possible pairings
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        matches.push({
          id: this.generateId(),
          player1: players[i],
          player2: players[j],
          status: 'pending'
        });
      }
    }

    this.currentTournament.matches = matches;
  }

  private generateSingleEliminationMatches(): void {
    if (!this.currentTournament) return;

    const players = [...this.currentTournament.players];
    const matches: Match[] = [];
    let round = 1;

    // Shuffle players for fair bracket
    this.shuffleArray(players);

    // Add byes if odd number of players
    while (players.length > 1 && (players.length & (players.length - 1)) !== 0) {
      players.push({
        id: 'bye',
        alias: 'BYE',
        wins: 0,
        losses: 0
      });
    }

    // Generate first round matches
    for (let i = 0; i < players.length; i += 2) {
      if (players[i + 1]?.id === 'bye') {
        // Player gets automatic advancement
        continue;
      }

      matches.push({
        id: this.generateId(),
        player1: players[i],
        player2: players[i + 1],
        status: 'pending',
        round
      });
    }

    this.currentTournament.matches = matches;
  }

  // Match Management
  getCurrentMatch(): Match | null {
    return this.currentTournament?.currentMatch || null;
  }

  getUpcomingMatches(): Match[] {
    if (!this.currentTournament) return [];
    
    return this.currentTournament.matches
      .filter(m => m.status === 'pending')
      .slice(0, 5); // Show next 5 matches
  }

  getCompletedMatches(): Match[] {
    if (!this.currentTournament) return [];
    
    return this.currentTournament.matches
      .filter(m => m.status === 'completed')
      .reverse(); // Most recent first
  }

  startMatch(matchId: string): Match {
    if (!this.currentTournament) {
      throw new Error('No active tournament');
    }

    const match = this.currentTournament.matches.find(m => m.id === matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (match.status !== 'pending') {
      throw new Error('Match is not pending');
    }

    match.status = 'playing';
    this.currentTournament.currentMatch = match;
    this.saveTournament();
    return match;
  }

  completeMatch(matchId: string, winnerId: string, player1Score: number, player2Score: number): void {
    if (!this.currentTournament) {
      throw new Error('No active tournament');
    }

    const match = this.currentTournament.matches.find(m => m.id === matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    const winner = match.player1.id === winnerId ? match.player1 : match.player2;
    const loser = match.player1.id === winnerId ? match.player2 : match.player1;

    match.winner = winner;
    match.player1Score = player1Score;
    match.player2Score = player2Score;
    match.status = 'completed';

    // Update player stats
    winner.wins++;
    loser.losses++;

    // Clear current match if this was it
    if (this.currentTournament.currentMatch?.id === matchId) {
      this.currentTournament.currentMatch = undefined;
    }

    // Handle tournament progression
    if (this.currentTournament.type === 'single-elimination') {
      this.progressSingleElimination(match);
    }

    this.setCurrentMatch();
    this.checkTournamentComplete();
    this.saveTournament();
  }

  private progressSingleElimination(completedMatch: Match): void {
    if (!this.currentTournament || !completedMatch.winner || !completedMatch.round) return;

    const currentRound = completedMatch.round;
    const roundMatches = this.currentTournament.matches.filter(m => m.round === currentRound);
    const completedRoundMatches = roundMatches.filter(m => m.status === 'completed');

    // Check if round is complete
    if (completedRoundMatches.length === roundMatches.length) {
      this.generateNextRound(currentRound);
    }
  }

  private generateNextRound(completedRound: number): void {
    if (!this.currentTournament) return;

    const winners = this.currentTournament.matches
      .filter(m => m.round === completedRound && m.winner)
      .map(m => m.winner!);

    if (winners.length <= 1) return; // Tournament complete

    const nextRound = completedRound + 1;
    const newMatches: Match[] = [];

    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        newMatches.push({
          id: this.generateId(),
          player1: winners[i],
          player2: winners[i + 1],
          status: 'pending',
          round: nextRound
        });
      }
    }

    this.currentTournament.matches.push(...newMatches);
  }

  private setCurrentMatch(): void {
    if (!this.currentTournament) return;

    // Find next pending match
    const nextMatch = this.currentTournament.matches.find(m => m.status === 'pending');
    this.currentTournament.currentMatch = nextMatch;
  }

  private checkTournamentComplete(): void {
    if (!this.currentTournament) return;

    const pendingMatches = this.currentTournament.matches.filter(m => m.status === 'pending');
    
    if (pendingMatches.length === 0) {
      this.currentTournament.status = 'completed';
      
      if (this.currentTournament.type === 'round-robin') {
        // Winner is player with most wins
        this.currentTournament.winner = this.currentTournament.players
          .sort((a, b) => b.wins - a.wins)[0];
      } else {
        // Winner is the last match winner
        const finalMatch = this.currentTournament.matches
          .filter(m => m.status === 'completed')
          .sort((a, b) => (b.round || 0) - (a.round || 0))[0];
        this.currentTournament.winner = finalMatch?.winner;
      }
    }
  }

  // Standings and Statistics
  getStandings(): Player[] {
    if (!this.currentTournament) return [];

    return [...this.currentTournament.players]
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.losses - b.losses;
      });
  }

  getTournamentStats() {
    if (!this.currentTournament) return null;

    const totalMatches = this.currentTournament.matches.length;
    const completedMatches = this.currentTournament.matches.filter(m => m.status === 'completed').length;
    const progress = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;

    return {
      totalPlayers: this.currentTournament.players.length,
      totalMatches,
      completedMatches,
      remainingMatches: totalMatches - completedMatches,
      progress: Math.round(progress),
      status: this.currentTournament.status,
      winner: this.currentTournament.winner
    };
  }

  // Persistence
  private saveTournament(): void {
    if (this.currentTournament) {
      localStorage.setItem(this.storageKey, JSON.stringify(this.currentTournament));
    }
  }

  private loadTournament(): void {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        this.currentTournament = JSON.parse(saved);
      } catch (error) {
        console.error('Failed to load tournament:', error);
        localStorage.removeItem(this.storageKey);
      }
    }
  }

  // Utility methods
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}