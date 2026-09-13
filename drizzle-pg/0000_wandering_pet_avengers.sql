CREATE TYPE "public"."novel_link_type" AS ENUM('read', 'download');--> statement-breakpoint
CREATE TYPE "public"."novel_status" AS ENUM('standalone', 'completed', 'ongoing');--> statement-breakpoint
CREATE TYPE "public"."reading_status" AS ENUM('want_to_read', 'reading', 'finished');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('published', 'pending', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."series_status" AS ENUM('completed', 'ongoing');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "authors" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name" varchar(255) NOT NULL,
	"bio" text,
	"avatarUrl" varchar(500),
	"bookCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "authors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"icon" varchar(20),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "genres_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "novelGenres" (
	"novelId" integer NOT NULL,
	"genreId" integer NOT NULL,
	CONSTRAINT "novelGenres_novelId_genreId_pk" PRIMARY KEY("novelId","genreId")
);
--> statement-breakpoint
CREATE TABLE "novelLinks" (
	"id" serial PRIMARY KEY NOT NULL,
	"novelId" integer NOT NULL,
	"label" varchar(120) NOT NULL,
	"url" varchar(1000) NOT NULL,
	"type" "novel_link_type" DEFAULT 'read' NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "novels" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(160) NOT NULL,
	"title" varchar(255) NOT NULL,
	"authorId" integer NOT NULL,
	"seriesId" integer,
	"coverUrl" varchar(500),
	"description" text,
	"rating" integer DEFAULT 0 NOT NULL,
	"ratingCount" integer DEFAULT 0 NOT NULL,
	"parts" integer DEFAULT 1 NOT NULL,
	"status" "novel_status" DEFAULT 'standalone' NOT NULL,
	"publicationYear" integer,
	"language" varchar(32) DEFAULT 'ar' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "novels_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"novelId" integer NOT NULL,
	"rating" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "readingListItems" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"novelId" integer NOT NULL,
	"status" "reading_status" DEFAULT 'want_to_read' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"novelId" integer NOT NULL,
	"rating" integer,
	"body" text NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(160) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "series_status" DEFAULT 'completed' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "series_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "seriesBooks" (
	"seriesId" integer NOT NULL,
	"novelId" integer NOT NULL,
	"order" integer NOT NULL,
	CONSTRAINT "seriesBooks_seriesId_novelId_pk" PRIMARY KEY("seriesId","novelId")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ratingsUserNovelUnique" ON "ratings" USING btree ("userId","novelId");--> statement-breakpoint
CREATE UNIQUE INDEX "readingListUserNovelUnique" ON "readingListItems" USING btree ("userId","novelId");