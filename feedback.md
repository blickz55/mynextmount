# Product feedback — MyNextMount

Internal log of tester and friend feedback. **Do not treat the AI digest as user research** — it is a compressed note for prioritization and copy experiments.

## How to update

1. Append new exchanges under **[## Raw log (append-only)](#raw-log-append-only)** with a dated `###` subheading.
2. Regenerate the digest:

   ```bash
   node scripts/feedback-summarize.mjs
   ```

   Uses **`OPENAI_API_KEY`**, **`FARM_TIP_OPENAI_API_KEY`**, or **`CONTENT_GUIDES_OPENAI_API_KEY`** from `.env.local` (same as other repo LLM scripts). Optional: **`FEEDBACK_LLM_MODEL`**, **`FEEDBACK_OPENAI_BASE_URL`**.

---

## AI digest

<!-- AI_DIGEST_START -->
_Last regenerated (UTC): 2026-03-27T03:29:45.485Z_

### Overview
MyNextMount is a WoW mount-farming assistant that consists of a website and an addon. Users can type a command in-game to export their mounts, which the website processes to provide a prioritized list of mounts to farm based on efficiency or rarity.

### Product / Positioning
- Concept: Similar to Raidbots but focused on mount collection.
- Target Audience: Primarily mount collectors and completionists in the WoW community.
- Tagline Ideas:
  - "Find the mounts that bring you closer to completing yours."
  - "Your best friend is a click away with MyNextMount."
  - "GET MOUNTED with MyNextMount."
  - "Mounts Made Simple."

### UX & Copy Ideas
- Consider a more humorous or tongue-in-cheek tone in the messaging, as suggested by testers.
- Suggested copy revisions:
  - "You (and your mounts) are in great hands with MyNextMount." 
  - "Completing your achievements? That's in the backlog."
- Focus on the simplicity and effectiveness of the tool, emphasizing ease of use for mount collectors.

### Feature / Backlog Hints
- Implement a feature for tracking achievements related to mounts.
- Explore options for personalized user experiences based on user data (e.g., gender-based messaging), but proceed cautiously to avoid exclusionary implications.

### Risks or Sensitivities
- The suggestion to use gender-based routing for messaging could be viewed as exclusionary or creepy. This requires careful consideration and product judgment to ensure inclusivity.

### Suggested Next Steps
- Gather more structured feedback from a broader user base during the alpha/beta rollout.
- Prioritize refining the user interface and experience based on initial tester feedback.
- Evaluate the implications of personalized messaging strategies to ensure they align with the brand's values and community standards.
<!-- AI_DIGEST_END -->

---

## Raw log (append-only)

### 2025-03-26 — Blickz ↔ Biscuit (Discord), early alpha / beta rollout

**Blickz — 10:55 PM**  
i've been geeking out working on a project

**Biscuit [FT] — 10:56 PM**  
nice  
what project

**Blickz — 10:57 PM**  
don't wanna say yet  
I think it'll be neat  
wow related

**Biscuit [FT] — 10:57 PM**  
well you should know I would keep it secret and safe  
but I get it bud

**Blickz — 10:58 PM**  
i just don't wanna show you something half done because i respect your opinion on this shit

**Blickz — 11:12 PM**  
alright fuck it, i want feedback  
do you want to see it

**Biscuit [FT] — 11:12 PM**  
up to you  
yes but dont feel pressured

**Blickz — 11:12 PM**  
so it's a wow addon  
but i don't have the addon uploaded to curseforge yet  
but do you know what raidbots is

**Biscuit [FT] — 11:13 PM**  
....  
yes

**Blickz — 11:14 PM**  
so think raidbots, but for mounts. I've spent the last few days building a website, and an addon, where you can type /mynextmount into wow and it gives you an output of your mounts. You paste it in and it gives you a prioritized list (based on efficiency or rarity) of the next mounts you should farm. Basically it's for mount farmers that want to go deep dick on getting the mounts they don't have.  
I have the addon on my local machine and it works  
sort of  
but i'm still making improvements  
https://www.mynextmount.com/tool  
MyNextMount — what to farm next  
Paste your WoW mount export from the MyNextMount addon and see top mounts to farm.  
https://www.mynextmount.com/  
MyNextMount — coming soon  
Know what to farm next from your mount collection. Trustworthy links, step-by-step guidance, and a WoW addon that exports what you own.  
actually start from this one  
this is for the beta rollout

**Biscuit [FT] — 11:16 PM**  
nice man  
I think that is awesome  
who is WE  
also side note im out here fuckign SWEATING playing fury warrior trying to be the best I can be for zao

**Blickz — 11:17 PM**  
so just type M:65645 into the export box and click Find My Mounts

**Biscuit [FT] — 11:17 PM**  
70ishk sustained as fury not great not terrible

**Blickz — 11:17 PM**  
who is we? what u mean  
yeah Fury is great when there's 20 mobs at once always

**Biscuit [FT] — 11:18 PM**  
[Image]

**Blickz — 11:18 PM**  
lol we is me

**Biscuit [FT] — 11:18 PM**  
[Image]  
so you want feedback

**Blickz — 11:19 PM**  
well once you have a minute to look at it yea

**Biscuit [FT] — 11:19 PM**  
im not even there yet

**Blickz — 11:23 PM**  
but yes, want feedback, keeping in mind this is early early alpha build  
so if it's about pictures or colors or text or anything that comes later

**Biscuit [FT] — 11:23 PM**  
Find the mounts that bring you closer to completing yours.

I personally would go something much more tongue in cheek because 90% of the people that are going to use this addon are women

Your best friend is a click away with MYNEXTMOUNT

MYNEXTMOUNT ....Mounts Made Simple

Youre (and your mounts) are in great hands with MYNEXTMOUNT  
You (and your mount) rather

**Blickz — 11:24 PM**  
completing your achievements? yeah that's in the backlog  
also 3 days in realized this is a lowkey porn name for a website and i can't believe i got this .com

**Biscuit [FT] — 11:24 PM**  
that makes it all the more better

**Blickz — 11:25 PM**  
oooh i like the idea of testing the tongue in cheek yes.  
Like the root for the idea was because i like collecting mounts but mostly just when i get them in the game then i don't give a fuck. but there's a lot of people that like collecting that shit for completionist purposes. and i found myself thinking if i had a site that was just like yeah you can get these 100 mounts in a day and here's how, that seemed intriguing to me

**Biscuit [FT] — 11:26 PM**  
GET MOUNTED with MYNEXTMOUNT  
amen  
i actually like mounts made simple

**Blickz — 11:27 PM**  
me too. maybe i could parse ip's or browser activity or cookies to tell if it's a male or female and males get what i like "what I have" and females get Mounts Made Simple
