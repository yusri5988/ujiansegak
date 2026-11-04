ALTER TABLE `training_schedules` ADD `order_index` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `training_schedules` AS current_schedule
SET `order_index` = (
  SELECT COUNT(*) - 1
  FROM `training_schedules` AS prior_schedule
  WHERE prior_schedule.class_id = current_schedule.class_id
    AND (
      prior_schedule.training_date < current_schedule.training_date
      OR (
        prior_schedule.training_date = current_schedule.training_date
        AND prior_schedule.id <= current_schedule.id
      )
    )
);--> statement-breakpoint
CREATE INDEX `training_schedules_class_order_idx` ON `training_schedules` (`class_id`,`order_index`,`id`);