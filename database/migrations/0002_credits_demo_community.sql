CREATE TABLE "credit_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" smallint NOT NULL,
	"transaction_type" text DEFAULT 'earning' NOT NULL,
	"activity_type" text NOT NULL,
	"description" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid,
	"administrator_id" uuid,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_transactions_type_check" CHECK ("credit_transactions"."transaction_type" IN ('earning', 'adjustment')),
	CONSTRAINT "credit_transactions_activity_check" CHECK ("credit_transactions"."activity_type" IN ('learning', 'teaching', 'mutual_completion', 'profile_complete', 'first_skill', 'first_exchange', 'admin_adjustment')),
	CONSTRAINT "credit_transactions_amount_check" CHECK (("credit_transactions"."transaction_type" = 'earning' AND "credit_transactions"."amount" > 0) OR ("credit_transactions"."transaction_type" = 'adjustment' AND "credit_transactions"."amount" <> 0)),
	CONSTRAINT "credit_transactions_adjustment_audit_check" CHECK ("credit_transactions"."transaction_type" = 'earning' OR ("credit_transactions"."administrator_id" IS NOT NULL AND length(trim(coalesce("credit_transactions"."reason", ''))) > 0))
);
--> statement-breakpoint
DROP VIEW "public"."users";--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "leaderboard_opt_out" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD COLUMN "sender_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD COLUMN "receiver_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_administrator_id_profiles_id_fk" FOREIGN KEY ("administrator_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "credit_transactions_exchange_event_idx" ON "credit_transactions" USING btree ("user_id","activity_type","source_type","source_id") WHERE "credit_transactions"."transaction_type" = 'earning' AND "credit_transactions"."activity_type" IN ('learning', 'teaching', 'mutual_completion');--> statement-breakpoint
CREATE UNIQUE INDEX "credit_transactions_milestone_idx" ON "credit_transactions" USING btree ("user_id","activity_type") WHERE "credit_transactions"."transaction_type" = 'earning' AND "credit_transactions"."activity_type" IN ('profile_complete', 'first_skill', 'first_exchange');--> statement-breakpoint
CREATE INDEX "credit_transactions_user_created_idx" ON "credit_transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_transactions_activity_created_idx" ON "credit_transactions" USING btree ("activity_type","created_at");--> statement-breakpoint
CREATE VIEW "public"."users" AS (select "id", "email", "role", "account_status", "email_verified_at", "full_name", "student_id", "department", "academic_year", "bio", "is_demo", "leaderboard_opt_out", "created_at", "updated_at", "reviewed_by", "reviewed_at", "status_note" from "profiles");