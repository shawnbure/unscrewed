-- Blog posts
--
-- Simple markdown-body blog. Public reads for status='published';
-- drafts stay hidden until the author publishes.
--
-- Slug is unique so URLs stay stable. author_id references users so
-- deleting a user via admin still leaves the post readable but with a
-- broken author link (we render "unscrewed team" as a fallback).

CREATE TABLE `blog_posts` (
  `id` text PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `title` text NOT NULL,
  `excerpt` text,
  `body_md` text NOT NULL,
  `hero_image_url` text,
  `author_id` text REFERENCES `users`(`id`),
  `status` text NOT NULL DEFAULT 'draft',    -- draft | published
  `date_published` integer,
  `is_deleted` integer NOT NULL DEFAULT 0,
  `date_created` integer NOT NULL DEFAULT (unixepoch() * 1000),
  `date_modified` integer NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX `ux_blog_posts_slug` ON `blog_posts` (`slug`);
CREATE INDEX `ix_blog_posts_status_date` ON `blog_posts` (`status`, `date_published` DESC);
