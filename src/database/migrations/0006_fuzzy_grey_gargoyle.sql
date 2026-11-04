ALTER TABLE `training_templates` ADD `school_id` integer REFERENCES schools(id);--> statement-breakpoint
CREATE INDEX `training_templates_school_id_idx` ON `training_templates` (`school_id`);--> statement-breakpoint
ALTER TABLE `ai_conversations` ADD `school_id` integer REFERENCES schools(id);--> statement-breakpoint
ALTER TABLE `ai_pending_actions` ADD `school_id` integer REFERENCES schools(id);--> statement-breakpoint
UPDATE `training_templates`
SET `school_id` = (
  SELECT profile.school_id FROM teacher_profiles profile
  WHERE profile.user_id = training_templates.teacher_id
    AND profile.updated_at <= training_templates.created_at
    AND NOT EXISTS (SELECT 1 FROM teacher_profiles other WHERE other.user_id = profile.user_id AND other.id <> profile.id)
  LIMIT 1
)
WHERE `school_id` IS NULL;--> statement-breakpoint
UPDATE `ai_conversations`
SET `school_id` = (
  SELECT profile.school_id FROM teacher_profiles profile
  WHERE profile.user_id = ai_conversations.teacher_id
    AND profile.updated_at <= ai_conversations.created_at
    AND NOT EXISTS (SELECT 1 FROM teacher_profiles other WHERE other.user_id = profile.user_id AND other.id <> profile.id)
  LIMIT 1
)
WHERE `school_id` IS NULL;--> statement-breakpoint
UPDATE `ai_pending_actions`
SET `school_id` = (
  SELECT conversation.school_id FROM ai_conversations conversation
  WHERE conversation.id = ai_pending_actions.conversation_id
    AND conversation.teacher_id = ai_pending_actions.teacher_id
)
WHERE `school_id` IS NULL;
