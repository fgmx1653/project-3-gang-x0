import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { pool } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",  // Always show account selection screen
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      try {
        const email = user?.email ?? null;
        const googleId = account?.providerAccountId ?? null;
        if (!email) return false; // must have email for identification

        // Look for existing user first
        let res = await pool.query("SELECT id, google_id FROM customers WHERE email = $1", [email]);

        if (res.rows.length === 0) {
          // Attempt creation
          const username = (email.split("@")[0] || user.name || "user").slice(0, 64);
          // Find the current max id
          const idRes = await pool.query('SELECT MAX(id) AS max_id FROM customers');
          const nextId = (idRes.rows[0]?.max_id ?? 0) + 1;
          const joindate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
          const defaultPoints = 0; // New customers start with 0 reward points
          await pool.query(
            `INSERT INTO customers (id, username, password, joindate, points, email, google_id, name)
             VALUES ($1, $2, NULL, $3, $4, $5, $6, $7)
             ON CONFLICT (email) DO NOTHING`,
            [nextId, username, joindate, defaultPoints, email, googleId, user.name ?? username]
          );
          // Re-check existence after attempted insert
          res = await pool.query("SELECT id, google_id FROM customers WHERE email = $1", [email]);
          if (res.rows.length === 0) {
            console.error("Sign-in aborted: customer record not created for email", email);
            return false; // Guard: do NOT allow sign-in if DB lacks record
          }
        } else if (googleId && !res.rows[0].google_id) {
          // Backfill google_id if previously null
          await pool.query(`UPDATE customers SET google_id = $2 WHERE email = $1`, [email, googleId]);
        }

        return true; // proceed only if record exists
      } catch (e) {
        console.error("next-auth signIn error; denying login", e);
        return false; // Guard: deny login on DB errors
      }
    },
    async jwt({ token }) {
      try {
        const email = token.email as string | undefined;
        if (!email) return token;
        const res = await pool.query(
          "SELECT id, username, name, points FROM customers WHERE email = $1",
          [email]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          (token as any).customerId = row.id;
          (token as any).points = row.points ?? 0;
          (token as any).displayName = row.name || row.username || token.name;
          (token as any).isCustomer = true;
        }
      } catch (_) {}
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).customerId ?? (session.user as any).id;
        (session.user as any).points = (token as any).points ?? 0;
        (session.user as any).isCustomer = (token as any).isCustomer ?? false;
        if ((token as any).displayName) session.user.name = (token as any).displayName as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
