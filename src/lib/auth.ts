import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function findActiveUserByEmail(email?: string | null) {
  if (!email) return null;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      avatar: users.avatar,
      active: users.active,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user?.active) return null;
  return user;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);

        if (!user || !user.active) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatar ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        return token;
      }

      const dbUser = await findActiveUserByEmail(token.email);
      if (dbUser) {
        token.id = dbUser.id;
        token.role = dbUser.role;
        token.name = dbUser.name;
        token.picture = dbUser.avatar ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
});

export type UserRole = "administrador" | "editor" | "colaborador";

export const PERMISSIONS = {
  administrador: ["users", "posts", "categories", "comments", "emails", "banners", "aniversarios", "settings"],
  editor: ["posts", "categories", "comments", "banners", "aniversarios"],
  colaborador: ["posts", "comments"],
} as const;

export async function resolveSessionUserByEmail(email?: string | null) {
  return findActiveUserByEmail(email);
}

export function hasPermission(role: UserRole, resource: string): boolean {
  const permissions = PERMISSIONS[role];
  return permissions?.includes(resource as never) ?? false;
}
