import type { UseCaseDeps } from '@/application/use-cases'
import {
  sessionRepository,
  participantRepository,
  roundRepository,
  voteRepository,
  scaleRepository,
  userRepository,
} from '@/infrastructure/db'
import { ablyPublisher } from '@/infrastructure/realtime/ably-publisher'

export const deps: UseCaseDeps = {
  sessionRepo: sessionRepository,
  participantRepo: participantRepository,
  roundRepo: roundRepository,
  voteRepo: voteRepository,
  scaleRepo: scaleRepository,
  eventPublisher: ablyPublisher,
  userRepo: userRepository,
}
