import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models/User';

/**
 * NextAuth v5 config.
 *
 * Обрали JWT-стратегію (без MongoDBAdapter) — причини:
 * 1. У проекті вже є mongoose connection pool через connectDB().
 *    Адаптер вимагав би окремий MongoClient — подвоєння підключень.
 * 2. XP і прогрес зберігаємо у власній User моделі (а не в auth-колекціях
 *    адаптера). У signIn callback робимо upsert у нашу колекцію.
 * 3. Клієнт отримує userId через session callback — його передаємо
 *    у localStorage-сесію квесту.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],

  session: {
    strategy: 'jwt',
  },

  callbacks: {
    /**
     * При кожному логіні — upsert юзера у нашу колекцію users.
     */
    async signIn({ user, account }) {
      if (account?.provider !== 'google') return true;
      if (!user.email) return false;

      try {
        await connectDB();

        await UserModel.findOneAndUpdate(
          { email: user.email.toLowerCase() },
          {
            $set: {
              googleId: account.providerAccountId,
              name: user.name ?? 'Турист',
              avatarUrl: user.image ?? '',
              lastLoginAt: new Date(),
            },
            $setOnInsert: {
              email: user.email.toLowerCase(),
              totalXp: 0,
              completedLines: [],
              createdAt: new Date(),
            },
          },
          { upsert: true, new: true },
        );

        return true;
      } catch (err) {
        console.error('signIn error:', err);
        return false;
      }
    },

    /**
     * У JWT кладемо userId з нашої БД, щоб клієнт міг його читати.
     */
    async jwt({ token, user, account }) {
      if (account?.provider === 'google' && user?.email) {
        try {
          await connectDB();
          const dbUser = await UserModel
            .findOne({ email: user.email.toLowerCase() })
            .select('_id')
            .lean<{ _id: mongoose.Types.ObjectId }>();
          if (dbUser) {
            token.userId = dbUser._id.toString();
          }
        } catch (err) {
          console.error('jwt callback error:', err);
        }
      }
      return token;
    },

    /**
     * Експонуємо userId клієнту через session.
     */
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});