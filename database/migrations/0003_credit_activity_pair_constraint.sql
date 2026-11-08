ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_activity_pair_check" CHECK (("credit_transactions"."transaction_type" = 'adjustment' AND "credit_transactions"."activity_type" = 'admin_adjustment') OR ("credit_transactions"."transaction_type" = 'earning' AND "credit_transactions"."activity_type" <> 'admin_adjustment'));
--> statement-breakpoint
INSERT INTO "credit_transactions" ("user_id","amount","transaction_type","activity_type","description","source_type","source_id")
SELECT p.id,15,'earning','profile_complete','Completed the required student profile','profile',p.id
FROM profiles p
WHERE p.role='student' AND length(trim(p.full_name))>=2 AND length(trim(p.department))>0 AND length(trim(p.academic_year))>0
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "credit_transactions" ("user_id","amount","transaction_type","activity_type","description","source_type","source_id")
SELECT DISTINCT ON (s.user_id) s.user_id,10,'earning','first_skill','Published the first teaching skill','skill',s.id
FROM skills s JOIN profiles p ON p.id=s.user_id
WHERE p.role='student' AND p.account_status='approved' AND s.skill_type='offered' AND s.is_active=true
ORDER BY s.user_id,s.created_at,s.id
ON CONFLICT DO NOTHING;
