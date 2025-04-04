-- CreateTable
CREATE TABLE `Users` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_login` DATETIME(3) NULL,
    `paid` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Users_email_key`(`email`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Profile` (
    `profile_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `curr_weight` DOUBLE NULL,
    `curr_height` DOUBLE NULL,
    `total_steps` INTEGER NOT NULL DEFAULT 0,
    `calories_burnt` DOUBLE NOT NULL DEFAULT 0.0,
    `photo` VARCHAR(191) NULL,
    `exercise_history` VARCHAR(191) NULL,
    `progress` VARCHAR(191) NULL,
    `nutrition` VARCHAR(191) NULL,
    `active_plan` VARCHAR(191) NULL,

    UNIQUE INDEX `Profile_user_id_key`(`user_id`),
    PRIMARY KEY (`profile_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Nutrition` (
    `nutrition_id` INTEGER NOT NULL AUTO_INCREMENT,
    `food_item` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `calories` DOUBLE NULL,
    `protein` DOUBLE NULL,
    `carbs` DOUBLE NULL,
    `fat` DOUBLE NULL,
    `fiber` DOUBLE NULL,
    `sugar` DOUBLE NULL,
    `sodium` DOUBLE NULL,
    `cholesterol` DOUBLE NULL,

    PRIMARY KEY (`nutrition_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Intake` (
    `intake_id` INTEGER NOT NULL AUTO_INCREMENT,
    `profile_id` INTEGER NOT NULL,
    `intake_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `type_meal` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `nutrition_id` INTEGER NOT NULL,

    PRIMARY KEY (`intake_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Exercise` (
    `exercise_id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` VARCHAR(191) NULL,
    `equipment` VARCHAR(191) NULL,
    `level` VARCHAR(191) NULL,
    `rating` DOUBLE NULL,
    `youtube_video` VARCHAR(191) NULL,
    `body_part` VARCHAR(191) NULL,

    PRIMARY KEY (`exercise_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Workout` (
    `workout_id` INTEGER NOT NULL AUTO_INCREMENT,
    `profile_id` INTEGER NOT NULL,
    `workout_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `start_time` DATETIME(3) NULL,
    `exercise_id` INTEGER NOT NULL,
    `duration` INTEGER NULL,

    PRIMARY KEY (`workout_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Activity` (
    `activity_id` INTEGER NOT NULL AUTO_INCREMENT,
    `profile_id` INTEGER NOT NULL,
    `steps` INTEGER NOT NULL DEFAULT 0,
    `minutes` INTEGER NOT NULL DEFAULT 0,
    `workout_id` INTEGER NULL,

    UNIQUE INDEX `Activity_workout_id_key`(`workout_id`),
    PRIMARY KEY (`activity_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Analysis` (
    `analysis_id` INTEGER NOT NULL AUTO_INCREMENT,
    `exercise_id` INTEGER NOT NULL,
    `workout_id` INTEGER NOT NULL,

    UNIQUE INDEX `Analysis_workout_id_key`(`workout_id`),
    PRIMARY KEY (`analysis_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subscriptions` (
    `subscription_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `cardholder` VARCHAR(191) NOT NULL,
    `card_number` VARCHAR(191) NOT NULL,
    `exp_date` DATETIME(3) NOT NULL,
    `cvv` VARCHAR(191) NOT NULL,
    `date_of_purchase` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `plan_purchased` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Subscriptions_user_id_key`(`user_id`),
    PRIMARY KEY (`subscription_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Progress` (
    `progress_id` INTEGER NOT NULL AUTO_INCREMENT,
    `profile_id` INTEGER NOT NULL,
    `record_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `height` DOUBLE NULL,
    `weight` DOUBLE NULL,
    `calories_burnt` DOUBLE NULL,
    `fat_percentage` DOUBLE NULL,

    PRIMARY KEY (`progress_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Profile` ADD CONSTRAINT `Profile_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Intake` ADD CONSTRAINT `Intake_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `Profile`(`profile_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Intake` ADD CONSTRAINT `Intake_nutrition_id_fkey` FOREIGN KEY (`nutrition_id`) REFERENCES `Nutrition`(`nutrition_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Workout` ADD CONSTRAINT `Workout_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `Profile`(`profile_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Workout` ADD CONSTRAINT `Workout_exercise_id_fkey` FOREIGN KEY (`exercise_id`) REFERENCES `Exercise`(`exercise_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Activity` ADD CONSTRAINT `Activity_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `Profile`(`profile_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Activity` ADD CONSTRAINT `Activity_workout_id_fkey` FOREIGN KEY (`workout_id`) REFERENCES `Workout`(`workout_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Analysis` ADD CONSTRAINT `Analysis_exercise_id_fkey` FOREIGN KEY (`exercise_id`) REFERENCES `Exercise`(`exercise_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Analysis` ADD CONSTRAINT `Analysis_workout_id_fkey` FOREIGN KEY (`workout_id`) REFERENCES `Workout`(`workout_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscriptions` ADD CONSTRAINT `Subscriptions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Progress` ADD CONSTRAINT `Progress_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `Profile`(`profile_id`) ON DELETE CASCADE ON UPDATE CASCADE;
