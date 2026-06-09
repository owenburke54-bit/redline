import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  rememberMe: z.string().optional(),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember me", type: "checkbox" },
      },
      async authorize(credentials) {
        console.log("[AUTH] authorize called with email:", credentials?.email);
        try {
          const parsed = loginSchema.safeParse(credentials);
          if (!parsed.success) {
            console.log("[AUTH] schema validation failed:", parsed.error.flatten());
            return null;
          }

          const user = await db.user.findUnique({
            where: { email: parsed.data.email },
          });
          console.log("[AUTH] user found:", !!user, "userId:", user?.id);

          if (!user || !user.password) {
            console.log("[AUTH] no user or no password field");
            return null;
          }

          const valid = await bcrypt.compare(parsed.data.password, user.password);
          console.log("[AUTH] password valid:", valid);

          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            onboardingComplete: user.onboardingComplete,
            rememberMe: parsed.data.rememberMe !== "false",
          };
        } catch (err) {
          console.error("[AUTH] authorize error:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.onboardingComplete = (user as { onboardingComplete?: boolean }).onboardingComplete ?? false;
        const rememberMe = (user as { rememberMe?: boolean }).rememberMe ?? true;
        if (!rememberMe) {
          // Session-only: expire JWT in 8 hours regardless of cookie lifetime
          token.exp = Math.floor(Date.now() / 1000) + 8 * 60 * 60;
        }
      }
      // Re-fetch onboardingComplete on session update (called after onboarding completes)
      if (trigger === "update" && token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { onboardingComplete: true },
        });
        if (dbUser) token.onboardingComplete = dbUser.onboardingComplete;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (typeof token.onboardingComplete === "boolean") {
        (session.user as { onboardingComplete?: boolean }).onboardingComplete =
          token.onboardingComplete;
      }
      return session;
    },
  },
});
