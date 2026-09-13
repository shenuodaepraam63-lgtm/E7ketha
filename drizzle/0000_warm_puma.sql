CREATE TABLE `authors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(160) NOT NULL,
	`name` varchar(255) NOT NULL,
	`bio` text,
	`avatarUrl` varchar(500),
	`bookCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `authors_id` PRIMARY KEY(`id`),
	CONSTRAINT `authors_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `genres` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(120) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`icon` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `genres_id` PRIMARY KEY(`id`),
	CONSTRAINT `genres_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `novelGenres` (
	`novelId` int NOT NULL,
	`genreId` int NOT NULL,
	CONSTRAINT `novelGenres_novelId_genreId_pk` PRIMARY KEY(`novelId`,`genreId`)
);
--> statement-breakpoint
CREATE TABLE `novels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(160) NOT NULL,
	`title` varchar(255) NOT NULL,
	`authorId` int NOT NULL,
	`seriesId` int,
	`coverUrl` varchar(500),
	`description` text,
	`rating` int NOT NULL DEFAULT 0,
	`ratingCount` int NOT NULL DEFAULT 0,
	`parts` int NOT NULL DEFAULT 1,
	`status` enum('standalone','completed','ongoing') NOT NULL DEFAULT 'standalone',
	`publicationYear` int,
	`language` varchar(32) NOT NULL DEFAULT 'ar',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `novels_id` PRIMARY KEY(`id`),
	CONSTRAINT `novels_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `ratings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`novelId` int NOT NULL,
	`rating` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ratings_id` PRIMARY KEY(`id`),
	CONSTRAINT `ratingsUserNovelUnique` UNIQUE(`userId`,`novelId`)
);
--> statement-breakpoint
CREATE TABLE `readingListItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`novelId` int NOT NULL,
	`status` enum('want_to_read','reading','finished') NOT NULL DEFAULT 'want_to_read',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `readingListItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `readingListUserNovelUnique` UNIQUE(`userId`,`novelId`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`novelId` int NOT NULL,
	`rating` int,
	`body` text NOT NULL,
	`status` enum('published','pending','hidden') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `series` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(160) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('completed','ongoing') NOT NULL DEFAULT 'completed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `series_id` PRIMARY KEY(`id`),
	CONSTRAINT `series_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `seriesBooks` (
	`seriesId` int NOT NULL,
	`novelId` int NOT NULL,
	`order` int NOT NULL,
	CONSTRAINT `seriesBooks_seriesId_novelId_pk` PRIMARY KEY(`seriesId`,`novelId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
