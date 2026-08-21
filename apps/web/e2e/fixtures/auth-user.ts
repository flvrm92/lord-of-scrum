/** The fixture account the `auth` project signs in as. Created in global setup. */
export const AUTH_USER = {
  id: 'e2e-fixture-user',
  name: 'Frodo Baggins',
  email: 'frodo@e2e.shire',
  lotrTitle: 'Ring-bearer of the Shire',
} as const

/** Where global setup writes the forged NextAuth storage state. */
export const STORAGE_STATE = './e2e/.auth/user.json'
