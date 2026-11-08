CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"target_user_id" uuid,
	"action" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"related_swap_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'student' NOT NULL,
	"account_status" text DEFAULT 'pending' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"full_name" text NOT NULL,
	"student_id" text,
	"department" text DEFAULT '' NOT NULL,
	"academic_year" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"status_note" text,
	CONSTRAINT "profiles_email_unique" UNIQUE("email"),
	CONSTRAINT "profiles_student_id_unique" UNIQUE("student_id"),
	CONSTRAINT "profiles_role_check" CHECK ("profiles"."role" IN ('student', 'admin')),
	CONSTRAINT "profiles_account_status_check" CHECK ("profiles"."account_status" IN ('pending', 'approved', 'rejected', 'suspended'))
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"swap_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewed_user_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_check" CHECK ("reviews"."rating" BETWEEN 1 AND 5),
	CONSTRAINT "reviews_participants_check" CHECK ("reviews"."reviewer_id" <> "reviews"."reviewed_user_id")
);
--> statement-breakpoint
CREATE TABLE "skill_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skill_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category_id" uuid,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"level" text DEFAULT 'beginner' NOT NULL,
	"skill_type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skills_level_check" CHECK ("skills"."level" IN ('beginner', 'intermediate', 'advanced', 'expert')),
	CONSTRAINT "skills_type_check" CHECK ("skills"."skill_type" IN ('offered', 'wanted'))
);
--> statement-breakpoint
CREATE TABLE "swap_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid NOT NULL,
	"receiver_id" uuid NOT NULL,
	"requested_skill_id" uuid NOT NULL,
	"offered_skill_id" uuid NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "swap_requests_status_check" CHECK ("swap_requests"."status" IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed')),
	CONSTRAINT "swap_requests_participants_check" CHECK ("swap_requests"."sender_id" <> "swap_requests"."receiver_id")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_target_user_id_profiles_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_swap_id_swap_requests_id_fk" FOREIGN KEY ("related_swap_id") REFERENCES "public"."swap_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_reviewed_by_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_swap_id_swap_requests_id_fk" FOREIGN KEY ("swap_id") REFERENCES "public"."swap_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_profiles_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewed_user_id_profiles_id_fk" FOREIGN KEY ("reviewed_user_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_category_id_skill_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."skill_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_sender_id_profiles_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_receiver_id_profiles_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_requested_skill_id_skills_id_fk" FOREIGN KEY ("requested_skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_offered_skill_id_skills_id_fk" FOREIGN KEY ("offered_skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "notifications" USING btree ("user_id","created_at") WHERE "notifications"."read_at" IS NULL;--> statement-breakpoint
CREATE INDEX "profiles_status_created_idx" ON "profiles" USING btree ("account_status","created_at");--> statement-breakpoint
CREATE INDEX "profiles_name_idx" ON "profiles" USING gin (to_tsvector('simple', "full_name"));--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_single_admin_idx" ON "profiles" USING btree ("role") WHERE "profiles"."role" = 'admin';--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_swap_reviewer_idx" ON "reviews" USING btree ("swap_id","reviewer_id");--> statement-breakpoint
CREATE INDEX "reviews_reviewed_idx" ON "reviews" USING btree ("reviewed_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_user_name_type_idx" ON "skills" USING btree ("user_id","name","skill_type");--> statement-breakpoint
CREATE INDEX "skills_discovery_idx" ON "skills" USING btree ("skill_type","is_active","category_id");--> statement-breakpoint
CREATE INDEX "skills_owner_idx" ON "skills" USING btree ("user_id","skill_type");--> statement-breakpoint
CREATE INDEX "swaps_sender_idx" ON "swap_requests" USING btree ("sender_id","status","created_at");--> statement-breakpoint
CREATE INDEX "swaps_receiver_idx" ON "swap_requests" USING btree ("receiver_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "swaps_active_duplicate_idx" ON "swap_requests" USING btree ("sender_id","receiver_id","requested_skill_id","offered_skill_id") WHERE "swap_requests"."status" IN ('pending', 'accepted');