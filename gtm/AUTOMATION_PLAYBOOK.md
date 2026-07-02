# unscrewed.lol — Automation Playbook

*How to run the growth plan in under 10 hours a week by handing the repetitive work to me (Claude, in Cowork mode).*

The site is **live at unscrewed.lol**, so this isn't hypothetical — I can produce real assets, research real communities, draft real outreach, and keep the machine running on a schedule.

---

## The honest boundaries first

I want to be straight with you, because your entire brand is trust:

- **I will not create fake users, fake trades, fake reviews, or astroturfed comments.** That's deception, it violates every platform's rules, and it would poison the exact thing (trust) your product sells. Seeding = *your real listings and real recruits*, never fabricated activity.
- **I can't log into platforms as you or post under your identity autonomously.** Reddit, TikTok, Instagram, and most sites forbid automated posting, and posting must come from a real human account to build real trust. What I *can* do is draft everything, schedule the drafts, research where to post, and — with the Claude-in-Chrome extension and you present — help you do it fast.
- **Where a platform offers a legitimate API or connector** (email, Discord, a social scheduler, analytics), I can plug into it and genuinely automate.

So the model is: **I do the creation, research, scheduling, and analysis. You do the ~2 hours a week of human clicks that must be human.** That's what keeps it under 10 hrs/wk.

---

## 1. The content engine (biggest time-saver)

This is where most of your hours would otherwise go. I can run it as **scheduled tasks** that generate ready-to-post drafts on a cadence, so you wake up to a queue and just approve/post.

What I can generate on a schedule:
- **Daily short-form video scripts** for the "I traded X for Y" and trade-chain series — hook, 3 beats, caption, hashtags — one per day, batched weekly.
- **Weekly Reddit posts** tailored to each target subreddit's culture (a value-first post for r/Anticonsumption reads nothing like a campus-sub post — I'll write each in-voice).
- **SEO blog posts** ("College move-out: trade it, don't trash it," "How to barter [X]") dropped as Markdown into your repo, ready to publish.
- **Manifesto quote cards** — shareable image concepts pulled from your TOS philosophy ("You're not crazy. You're awake.").

To make these sound like *you*, run `setup-writing-style` and I'll match your voice on every draft. If you want, I'll set up a **scheduled task that delivers a week of content every Monday morning.**

## 2. Research & targeting (I do this end-to-end)

- **Find your beachhead campus:** I can research which mid-size campuses have the most active subreddits, existing "Free & For Sale" groups, and strong sustainability programs — and rank them for you.
- **Map the communities:** build you a list of every relevant subreddit, Discord, Facebook group, and campus club with member counts and posting rules, so you never waste a post.
- **Find partnership contacts:** using Claude-in-Chrome, I can pull the sustainability office, student-government, and relevant club contact emails for your target campus into a spreadsheet.
- **Competitive/keyword research** for the SEO content.

## 3. Outreach drafting (you send, I write)

- **Ambassador recruitment** messages, the founding-trader pitch, and the Discord welcome/onboarding flow.
- **Partnership pitch emails** to sustainability offices and clubs — leading with the waste-reduction angle, personalized per recipient from the research spreadsheet.
- **Press pitches** to campus papers and local news when you have data and stories.
- If you connect an email account (I can suggest a connector), I can help draft and queue these as a mail-merge; you review and hit send.

## 4. Live dashboards & shareable pages (artifacts)

I can build **live artifacts** — self-contained pages that refresh themselves — that live in Cowork and pull fresh data each time you open them:

- **A growth dashboard** tracking your north-star metrics (completed trades/week, liquidity rate, weekly active traders, time-to-first-trade). *This needs a way to read your data* — the cleanest path is a small read-only stats endpoint on your Cloudflare Worker API that returns the numbers; then the dashboard calls it. I can spec that endpoint for you.
- **A "Trade of the Week" page** you can share publicly — auto-formatted from your best recent trades into content.
- **A launch-readiness checklist** page for each new campus rollout.

## 5. The repeatable launch kit (one-time, reused forever)

I'll produce, as real files in your repo:
- **Flyer + sticker designs** (print-ready) with your QR code.
- **The campus launch playbook** — a step-by-step checklist so campus #2, #3, #4 each launch faster than the last.
- **The ambassador kit** — what they post, when, and the templates they use.
- **Seed-listing templates** across your seven categories so any new campus starts non-empty.

## 6. Scheduled autopilot (set once, runs forever)

Concrete scheduled tasks I can set up right now:
- **Monday 7am — Content drop:** a full week of social scripts + one Reddit post + one blog draft, in your voice, waiting for approval.
- **Friday 4pm — Growth review:** I pull your metrics (once the stats endpoint exists), summarize what moved, and flag what to fix.
- **Daily — Mention watch:** I search Reddit/web for people talking about barter, move-out waste, or your brand, and hand you a short list of conversations worth joining (you post, as a human).
- **Move-out/move-in reminder:** a task that pings you 3 weeks before the seasonal spike so you launch on time.

## 7. Connectors worth adding

I'll search the connector registry and suggest the specific ones, but the high-value candidates for you are: **a social scheduler** (queue the content I generate), **email** (ambassador/partnership outreach), **Discord** (founding-member community automation), and **analytics**. Say the word and I'll pull up what's available and wire up the ones that fit.

---

## What I'd do first, in order

1. **Run `setup-writing-style`** so every draft sounds like you, not like a robot. (2 min of your time.)
2. **Let me research and recommend your specific beachhead campus** — I'll come back with a ranked shortlist. (Fully automated.)
3. **Set up the Monday content-drop scheduled task** so the engine starts turning immediately.
4. **Build the launch kit** (flyers, stickers, playbook, ambassador kit) as reusable files.
5. **Spec the stats endpoint** so I can build you a live growth dashboard.

Tell me which of these to kick off and I'll start. My recommendation: start with #1 and #2 today — they cost you almost nothing and unblock everything else.

---

## The division of labor, summarized

| Work | Who |
|---|---|
| Content creation, scripts, blog, copy | **Me** (scheduled) |
| Community & partnership research | **Me** |
| Outreach & press drafting | **Me** (you send) |
| Dashboards, playbooks, launch kits, flyers | **Me** |
| Metric tracking & weekly review | **Me** (scheduled) |
| Posting under your real accounts | **You** (~2 hrs/wk) |
| Showing up to the one campus event | **You** |
| Brokering the first trades / talking to humans | **You** |

The parts only a human can do — being a real person in a real community — stay with you. Everything that scales by repetition, I take. That's how a solo, part-time founder runs a national playbook.
