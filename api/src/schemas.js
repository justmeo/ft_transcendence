// Common schemas for request validation
const schemas = {
  // Health endpoint - no input validation needed
  health: {
    response: {
      200: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          uptime: { type: 'number' },
          version: { type: 'string' },
          timestamp: { type: 'string' },
          database: {
            type: 'object',
            properties: {
              connected: { type: 'boolean' },
              tables: { type: 'number' }
            }
          },
          security: {
            type: 'object',
            properties: {
              https: { type: 'boolean' },
              headers: { type: 'boolean' },
              rateLimit: { type: 'boolean' }
            }
          }
        },
        required: ['ok', 'uptime', 'version', 'timestamp']
      }
    }
  },

  // Auth signup
  authSignup: {
    body: {
      type: 'object',
      properties: {
        email: { 
          type: 'string', 
          format: 'email',
          maxLength: 255
        },
        password: { 
          type: 'string', 
          minLength: 6, 
          maxLength: 100
        },
        displayName: {
          type: 'string',
          minLength: 3,
          maxLength: 50,
          pattern: '^[a-zA-Z0-9_]+$'
        },
        avatarUrl: {
          type: 'string',
          format: 'uri',
          maxLength: 500
        }
      },
      required: ['email', 'password', 'displayName'],
      additionalProperties: false
    },
    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          username: { type: 'string' },
          email: { type: 'string' },
          created_at: { type: 'string' }
        }
      },
      400: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' }
        }
      }
    }
  },

  // Auth login
  authLogin: {
    body: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 1 }
      },
      required: ['email', 'password'],
      additionalProperties: false
    }
  },

  // User response (without password)
  userResponse: {
    type: 'object',
    properties: {
      id: { type: 'number' },
      email: { type: 'string' },
      display_name: { type: 'string' },
      avatar_url: { type: ['string', 'null'] },
      created_at: { type: 'string' },
      updated_at: { type: 'string' }
    }
  },

  // User stats response
  userStatsResponse: {
    type: 'object',
    properties: {
      totalGames: { type: 'number' },
      wins: { type: 'number' },
      losses: { type: 'number' },
      winRate: { type: 'string' },
      rank: { type: 'string' },
      rating: { type: 'number' },
      longestWinStreak: { type: 'number' },
      favoriteOpponent: { type: ['string', 'null'] }
    }
  },

  // Create game
  createGame: {
    body: {
      type: 'object',
      properties: {
        player2_id: { type: 'number', minimum: 1 }
      },
      required: ['player2_id'],
      additionalProperties: false
    },
    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          player1_id: { type: 'number' },
          player2_id: { type: 'number' },
          status: { type: 'string' },
          created_at: { type: 'string' }
        }
      }
    }
  },

  // Get games list
  getGames: {
    querystring: {
      type: 'object',
      properties: {
        limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
        offset: { type: 'number', minimum: 0, default: 0 },
        status: { type: 'string', enum: ['pending', 'active', 'finished'] }
      },
      additionalProperties: false
    },
    response: {
      200: {
        type: 'object',
        properties: {
          games: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                player1_id: { type: 'number' },
                player2_id: { type: 'number' },
                player1_score: { type: 'number' },
                player2_score: { type: 'number' },
                status: { type: 'string' },
                created_at: { type: 'string' }
              }
            }
          },
          total: { type: 'number' },
          limit: { type: 'number' },
          offset: { type: 'number' }
        }
      }
    }
  },

  // Tournament schemas
  createTournament: {
    body: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 3, maxLength: 255 },
        type: { type: 'string', enum: ['single-elimination', 'round-robin'] },
        maxParticipants: { type: ['number', 'null'], minimum: 2, maximum: 128 }
      },
      required: ['name', 'type'],
      additionalProperties: false
    }
  },

  tournamentResponse: {
    type: 'object',
    properties: {
      id: { type: 'number' },
      name: { type: 'string' },
      type: { type: 'string' },
      status: { type: 'string' },
      max_participants: { type: ['number', 'null'] },
      participant_count: { type: 'number' },
      created_by: { type: 'number' },
      creator_name: { type: 'string' },
      winner_id: { type: ['number', 'null'] },
      winner_name: { type: ['string', 'null'] },
      created_at: { type: 'string' },
      started_at: { type: ['string', 'null'] },
      completed_at: { type: ['string', 'null'] }
    }
  },

  recordMatchResult: {
    body: {
      type: 'object',
      properties: {
        winnerId: { type: 'number' },
        player1Score: { type: 'number', minimum: 0 },
        player2Score: { type: 'number', minimum: 0 }
      },
      required: ['winnerId', 'player1Score', 'player2Score'],
      additionalProperties: false
    }
  },

  // Generic error response
  error: {
    type: 'object',
    properties: {
      error: { type: 'string' },
      message: { type: 'string' },
      statusCode: { type: 'number' }
    },
    required: ['error', 'message', 'statusCode']
  }
};

module.exports = schemas;