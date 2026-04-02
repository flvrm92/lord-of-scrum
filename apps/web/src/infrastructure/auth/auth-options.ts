import type { NextAuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/infrastructure/db/client'
import { getRandomLotrTitle } from '@/domain/rules'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  providers: [
    ...(process.env.GITHUB_CLIENT_ID
      ? [
        GithubProvider({
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        }),
      ]
      : []),
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
      ]
      : []),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth/signin' },
  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, user object is provided
      if (user?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { lotrTitle: true },
        })
        if (dbUser && !dbUser.lotrTitle) {
          const title = getRandomLotrTitle()
          await prisma.user.update({ where: { id: user.id }, data: { lotrTitle: title } })
          token.lotrTitle = title
        } else {
          token.lotrTitle = dbUser?.lotrTitle ?? null
        }
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        session.user.lotrTitle = (token.lotrTitle as string | null | undefined) ?? null
      }
      return session
    },
  },
}
