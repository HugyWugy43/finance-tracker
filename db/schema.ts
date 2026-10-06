import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), fullName: text('full_name').notNull(), nickname: text('nickname').notNull().unique(),
  email: text('email').notNull().unique(), passwordHash: text('password_hash').notNull(), salt: text('salt').notNull(),
  budget: integer('budget').notNull().default(5000000), createdAt: integer('created_at').notNull(),
});
export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(), userId: text('user_id').notNull().references(() => users.id, {onDelete:'cascade'}), expiresAt: integer('expires_at').notNull(),
}, t => [index('idx_sessions_user').on(t.userId)]);
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id, {onDelete:'cascade'}),
  type: text('type').notNull(), amount: integer('amount').notNull(), category: text('category').notNull(),
  title: text('title').notNull(), date: text('date').notNull(), account: text('account').notNull(), createdAt: integer('created_at').notNull(),
}, t => [index('idx_transactions_user_date').on(t.userId,t.date)]);
export const authAttempts = sqliteTable('auth_attempts', {
  key: text('key').primaryKey(), count: integer('count').notNull(), resetAt: integer('reset_at').notNull(),
});
