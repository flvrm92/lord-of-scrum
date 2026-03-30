export const queryKeys = {
  session: (id: string) => ['session', id] as const,
  sessionByCode: (code: string) => ['session', 'code', code] as const,
  scales: () => ['scales'] as const,
  history: (sessionId: string) => ['history', sessionId] as const,
  userSessions: () => ['user', 'sessions'] as const,
}
