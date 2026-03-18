import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        
        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email) }
        })

        if (!user) return null

        const passwordsMatch = await bcrypt.compare(
          String(credentials.password),
          user.password
        )

        if (passwordsMatch) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone ?? undefined,
            role: user.role,
          }
        }
        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
        token.phone = user.phone
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role as "ADMIN" | "CUSTOMER"
        session.user.id = token.id as string
        session.user.phone = typeof token.phone === "string" ? token.phone : undefined
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/login",
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
})
