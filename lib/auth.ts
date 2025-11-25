import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { pool } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      try {
        const email = user?.email ?? null;
        const googleId = account?.providerAccountId ?? null;
        if (!email) return false; // must have email for identification

        // Look for existing user first
        let res = await pool.query("SELECT id, google_id FROM employees WHERE email = $1", [email]);

        if (res.rows.length === 0) {
          // Attempt creation
          const username = (email.split("@")[0] || user.name || "user").slice(0, 64);
          // Find the current max id
          const idRes = await pool.query('SELECT MAX(id) AS max_id FROM employees');
          const nextId = (idRes.rows[0]?.max_id ?? 0) + 1;
          const employdate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
          const hrsalary = 15;
          await pool.query(
            `INSERT INTO employees (id, username, password, ismanager, employdate, hrsalary, email, google_id, name)
             VALUES ($1, $2, NULL, 0, $3, $4, $5, $6, $7)
             ON CONFLICT (email) DO NOTHING`,
            [nextId, username, employdate, hrsalary, email, googleId, user.name ?? username]
          );
          // Re-check existence after attempted insert
          res = await pool.query("SELECT id, google_id FROM employees WHERE email = $1", [email]);
          if (res.rows.length === 0) {
            console.error("Sign-in aborted: employee record not created for email", email);
            return false; // Guard: do NOT allow sign-in if DB lacks record
          }
        } else if (googleId && !res.rows[0].google_id) {
          // Backfill google_id if previously null
          await pool.query(`UPDATE employees SET google_id = $2 WHERE email = $1`, [email, googleId]);
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
          "SELECT id, ismanager, username, name FROM employees WHERE email = $1",
          [email]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          (token as any).employeeId = row.id;
          (token as any).ismanager = row.ismanager === true || row.ismanager === 1 || row.ismanager === '1';
          (token as any).displayName = row.name || row.username || token.name;
        }
      } catch (_) {}
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).employeeId ?? (session.user as any).id;
        (session.user as any).ismanager = (token as any).ismanager ?? false;
        if ((token as any).displayName) session.user.name = (token as any).displayName as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
