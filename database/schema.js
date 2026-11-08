import { sql } from "drizzle-orm";
import {
  boolean, check, index, jsonb, pgTable, pgView, smallint, text, timestamp,
  uniqueIndex, uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// Authentication identities and credentials live in Neon Managed Better Auth's
// neon_auth schema. This table contains only SkillSwap application data.
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("student"),
  accountStatus: text("account_status").notNull().default("pending"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  fullName: text("full_name").notNull(),
  studentId: text("student_id").unique(),
  department: text("department").notNull().default(""),
  academicYear: text("academic_year").notNull().default(""),
  bio: text("bio").notNull().default(""),
  isDemo: boolean("is_demo").notNull().default(false),
  leaderboardOptOut: boolean("leaderboard_opt_out").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  reviewedBy: uuid("reviewed_by").references(() => profiles.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  statusNote: text("status_note"),
}, (t) => [
  check("profiles_role_check", sql`${t.role} IN ('student', 'admin')`),
  check("profiles_account_status_check", sql`${t.accountStatus} IN ('pending', 'approved', 'rejected', 'suspended')`),
  index("profiles_status_created_idx").on(t.accountStatus, t.createdAt),
  index("profiles_name_idx").using("gin", sql`to_tsvector('simple', ${t.fullName})`),
  uniqueIndex("profiles_single_admin_idx").on(t.role).where(sql`${t.role} = 'admin'`),
]);

// Compatibility read/write view for existing SkillSwap routes. It contains no
// credentials; PostgreSQL can update this simple single-table view directly.
export const users = pgView("users").as((qb) => qb.select().from(profiles));

export const skillCategories = pgTable("skill_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
});

export const skills = pgTable("skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => skillCategories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  level: text("level").notNull().default("beginner"),
  skillType: text("skill_type").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  check("skills_level_check", sql`${t.level} IN ('beginner', 'intermediate', 'advanced', 'expert')`),
  check("skills_type_check", sql`${t.skillType} IN ('offered', 'wanted')`),
  uniqueIndex("skills_user_name_type_idx").on(t.userId, t.name, t.skillType),
  index("skills_discovery_idx").on(t.skillType, t.isActive, t.categoryId),
  index("skills_owner_idx").on(t.userId, t.skillType),
]);

export const swapRequests = pgTable("swap_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id").notNull().references(() => profiles.id, { onDelete: "restrict" }),
  receiverId: uuid("receiver_id").notNull().references(() => profiles.id, { onDelete: "restrict" }),
  requestedSkillId: uuid("requested_skill_id").notNull().references(() => skills.id, { onDelete: "restrict" }),
  offeredSkillId: uuid("offered_skill_id").notNull().references(() => skills.id, { onDelete: "restrict" }),
  message: text("message").notNull().default(""),
  status: text("status").notNull().default("pending"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  senderCompletedAt: timestamp("sender_completed_at", { withTimezone: true }),
  receiverCompletedAt: timestamp("receiver_completed_at", { withTimezone: true }),
  isDemo: boolean("is_demo").notNull().default(false),
}, (t) => [
  check("swap_requests_status_check", sql`${t.status} IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed')`),
  check("swap_requests_participants_check", sql`${t.senderId} <> ${t.receiverId}`),
  index("swaps_sender_idx").on(t.senderId, t.status, t.createdAt),
  index("swaps_receiver_idx").on(t.receiverId, t.status, t.createdAt),
  uniqueIndex("swaps_active_duplicate_idx").on(t.senderId, t.receiverId, t.requestedSkillId, t.offeredSkillId).where(sql`${t.status} IN ('pending', 'accepted')`),
]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  isDemo: boolean("is_demo").notNull().default(false),
  relatedSwapId: uuid("related_swap_id").references(() => swapRequests.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index("notifications_unread_idx").on(t.userId, t.createdAt).where(sql`${t.readAt} IS NULL`)]);

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  swapId: uuid("swap_id").notNull().references(() => swapRequests.id, { onDelete: "restrict" }),
  reviewerId: uuid("reviewer_id").notNull().references(() => profiles.id, { onDelete: "restrict" }),
  reviewedUserId: uuid("reviewed_user_id").notNull().references(() => profiles.id, { onDelete: "restrict" }),
  rating: smallint("rating").notNull(),
  comment: text("comment").notNull().default(""),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [
  check("reviews_rating_check", sql`${t.rating} BETWEEN 1 AND 5`),
  check("reviews_participants_check", sql`${t.reviewerId} <> ${t.reviewedUserId}`),
  uniqueIndex("reviews_swap_reviewer_idx").on(t.swapId, t.reviewerId),
  index("reviews_reviewed_idx").on(t.reviewedUserId, t.createdAt),
]);

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
  targetUserId: uuid("target_user_id").references(() => profiles.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  details: jsonb("details").notNull().default({}),
  createdAt: createdAt(),
}, (t) => [index("audit_log_created_idx").on(t.createdAt)]);

export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "restrict" }),
  amount: smallint("amount").notNull(),
  transactionType: text("transaction_type").notNull().default("earning"),
  activityType: text("activity_type").notNull(),
  description: text("description").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: uuid("source_id"),
  administratorId: uuid("administrator_id").references(() => profiles.id, { onDelete: "restrict" }),
  reason: text("reason"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: createdAt(),
}, (t) => [
  check("credit_transactions_type_check", sql`${t.transactionType} IN ('earning', 'adjustment')`),
  check("credit_transactions_activity_check", sql`${t.activityType} IN ('learning', 'teaching', 'mutual_completion', 'profile_complete', 'first_skill', 'first_exchange', 'admin_adjustment')`),
  check("credit_transactions_activity_pair_check", sql`(${t.transactionType} = 'adjustment' AND ${t.activityType} = 'admin_adjustment') OR (${t.transactionType} = 'earning' AND ${t.activityType} <> 'admin_adjustment')`),
  check("credit_transactions_amount_check", sql`(${t.transactionType} = 'earning' AND ${t.amount} > 0) OR (${t.transactionType} = 'adjustment' AND ${t.amount} <> 0)`),
  check("credit_transactions_adjustment_audit_check", sql`${t.transactionType} = 'earning' OR (${t.administratorId} IS NOT NULL AND length(trim(coalesce(${t.reason}, ''))) > 0)`),
  uniqueIndex("credit_transactions_exchange_event_idx").on(t.userId, t.activityType, t.sourceType, t.sourceId).where(sql`${t.transactionType} = 'earning' AND ${t.activityType} IN ('learning', 'teaching', 'mutual_completion')`),
  uniqueIndex("credit_transactions_milestone_idx").on(t.userId, t.activityType).where(sql`${t.transactionType} = 'earning' AND ${t.activityType} IN ('profile_complete', 'first_skill', 'first_exchange')`),
  index("credit_transactions_user_created_idx").on(t.userId, t.createdAt),
  index("credit_transactions_activity_created_idx").on(t.activityType, t.createdAt),
]);
