CREATE TABLE "ai_photo_session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"first_prompt" text,
	"task_count" integer DEFAULT 0 NOT NULL,
	"last_activity" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_photo_task" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text NOT NULL,
	"prompt" text NOT NULL,
	"input_images" json,
	"output_image_url" text,
	"status" text NOT NULL,
	"task_id" text,
	"provider_model" text,
	"credits_cost" integer NOT NULL,
	"error_message" text,
	"sequence_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "ai_photo_session" ADD CONSTRAINT "ai_photo_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_photo_task" ADD CONSTRAINT "ai_photo_task_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_photo_task" ADD CONSTRAINT "ai_photo_task_session_id_ai_photo_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_photo_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_photo_session_user_activity_idx" ON "ai_photo_session" USING btree ("user_id","last_activity");--> statement-breakpoint
CREATE INDEX "ai_photo_session_user_created_idx" ON "ai_photo_session" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_photo_task_session_order_idx" ON "ai_photo_task" USING btree ("session_id","sequence_order");--> statement-breakpoint
CREATE INDEX "ai_photo_task_task_id_idx" ON "ai_photo_task" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "ai_photo_task_user_created_idx" ON "ai_photo_task" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_photo_task_status_idx" ON "ai_photo_task" USING btree ("status");