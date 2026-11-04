CREATE TABLE `daily_activity_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`log_date` text NOT NULL,
	`warmup_completed` integer DEFAULT true,
	`curl_up_reps` integer DEFAULT 0,
	`cardio_duration_minutes` integer DEFAULT 3,
	`cardio_pulse_or_reps` integer DEFAULT 0,
	`push_up_reps` integer DEFAULT 0,
	`sit_reach_cm` real DEFAULT 0,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `smartfit_app_users`(`id`) ON UPDATE no action ON DELETE cascade
);
