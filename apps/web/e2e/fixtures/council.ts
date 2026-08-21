import type { Browser, BrowserContext, BrowserContextOptions, Page } from '@playwright/test'
import type { ParticipantDto, RoundDto, SessionDto } from '@/application/dtos'
import { Api } from './api'
import { SessionRoom } from '../pages/session-room'
import { ChroniclesPage } from '../pages/chronicles'

/**
 * One seat at the council: its own browser context, because participant
 * identity lives only in `localStorage['participant:<sessionId>']` (see
 * `src/app/page.tsx`). Two tabs in one context would share an identity, so
 * every player needs a context of its own.
 */
export class Player {
  readonly room: SessionRoom
  readonly chronicles: ChroniclesPage

  private constructor(
    readonly context: BrowserContext,
    readonly page: Page,
    readonly participant: ParticipantDto,
    readonly session: SessionDto,
  ) {
    this.room = new SessionRoom(page, session.inviteCode)
    this.chronicles = new ChroniclesPage(page, session.inviteCode)
  }

  static async create(
    browser: Browser,
    session: SessionDto,
    participant: ParticipantDto,
    contextOptions: BrowserContextOptions,
  ): Promise<Player> {
    // Contexts made by hand inherit nothing from the config's `use` block, so
    // baseURL and reducedMotion have to be handed over explicitly — without
    // them relative gotos fail and the reveal animation comes back.
    const context = await browser.newContext(contextOptions)
    // Seeded before any navigation so the room's first fetch already knows who
    // we are — otherwise the page renders its "not joined" error state.
    await context.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      [`participant:${session.id}`, JSON.stringify(participant)] as const,
    )
    const page = await context.newPage()
    return new Player(context, page, participant, session)
  }

  get name(): string {
    return this.participant.displayName
  }

  async close(): Promise<void> {
    await this.context.close()
  }
}

/**
 * A session plus the players in it. Created per test with a unique name, so
 * tests never share rows and can run fully parallel against one database.
 */
export class Council {
  private readonly players: Player[] = []

  private constructor(
    private readonly browser: Browser,
    readonly api: Api,
    public session: SessionDto,
    readonly host: Player,
    private readonly contextOptions: BrowserContextOptions,
  ) {
    this.players.push(host)
  }

  static async create(
    browser: Browser,
    api: Api,
    opts: { name: string; hostName?: string; scaleId?: string },
    contextOptions: BrowserContextOptions,
  ): Promise<Council> {
    const session = await api.createSession({
      name: opts.name,
      hostDisplayName: opts.hostName ?? 'Gandalf',
      scaleId: opts.scaleId,
    })
    const hostParticipant = session.participants[0]
    const host = await Player.create(browser, session, hostParticipant, contextOptions)
    return new Council(browser, api, session, host, contextOptions)
  }

  /** Add a player via the join API and give them their own browser context. */
  async invite(displayName: string): Promise<Player> {
    const { participant } = await this.api.joinSession(this.session.inviteCode, displayName)
    const player = await Player.create(this.browser, this.session, participant, this.contextOptions)
    this.players.push(player)
    return player
  }

  /** Start a round at the API level, for tests not asserting the start UI. */
  async startRound(topic: string): Promise<RoundDto> {
    return this.api.startRound(this.session.id, topic, this.host.participant.id)
  }

  async currentRound(): Promise<RoundDto> {
    const fresh = await this.api.getSession(this.session.id)
    if (!fresh.currentRound) throw new Error('No current round')
    return fresh.currentRound
  }

  async closeAll(): Promise<void> {
    await Promise.all(this.players.map((p) => p.close()))
  }
}
