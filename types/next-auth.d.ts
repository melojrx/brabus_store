import NextAuth, { type DefaultSession } from "next-auth"

export type ExtendedUser = DefaultSession["user"] & {
  id: string
  phone?: string
  role: "ADMIN" | "CUSTOMER" | "SELLER"
  mustChangePassword?: boolean
}

declare module "next-auth" {
  interface Session {
    user: ExtendedUser
  }

  interface User {
    id: string
    phone?: string
    role: "ADMIN" | "CUSTOMER" | "SELLER"
    mustChangePassword?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    phone?: string
    role?: "ADMIN" | "CUSTOMER" | "SELLER"
    mustChangePassword?: boolean
  }
}
