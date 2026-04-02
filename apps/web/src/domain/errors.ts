export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

export class RoundNotVotingError extends DomainError {
  constructor() {
    super('Round is not in VOTING status', 'ROUND_NOT_VOTING')
  }
}

export class DuplicateVoteError extends DomainError {
  constructor() {
    super('Participant already voted in this round', 'DUPLICATE_VOTE')
  }
}

export class DuplicateDisplayNameError extends DomainError {
  constructor(name: string) {
    super(`Display name "${name}" is already taken in this session`, 'DUPLICATE_DISPLAY_NAME')
  }
}

export class SessionNotActiveError extends DomainError {
  constructor() {
    super('Session is not active', 'SESSION_NOT_ACTIVE')
  }
}

export class NotHostError extends DomainError {
  constructor() {
    super('Only the host can perform this action', 'NOT_HOST')
  }
}

export class InvalidVoteValueError extends DomainError {
  constructor(value: string) {
    super(`"${value}" is not a valid scale value`, 'INVALID_VOTE_VALUE')
  }
}

export class InvalidDisplayNameError extends DomainError {
  constructor() {
    super('Display name must be 1-30 characters', 'INVALID_DISPLAY_NAME')
  }
}

export class SessionNotFoundError extends DomainError {
  constructor() {
    super('Session not found', 'SESSION_NOT_FOUND')
  }
}

export class ParticipantNotFoundError extends DomainError {
  constructor() {
    super('Participant not found', 'PARTICIPANT_NOT_FOUND')
  }
}

export class RoundNotFoundError extends DomainError {
  constructor() {
    super('Round not found', 'ROUND_NOT_FOUND')
  }
}

export class CannotRemoveSelfAsHostError extends DomainError {
  constructor() {
    super('The host cannot remove themselves from the session', 'CANNOT_REMOVE_SELF_AS_HOST')
  }
}

export class NotParticipantError extends DomainError {
  constructor() {
    super('Requester is not a participant in this session', 'NOT_PARTICIPANT')
  }
}
