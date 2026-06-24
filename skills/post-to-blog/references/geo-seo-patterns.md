# GEO/SEO patterns for blog posts

GEO = Generative Engine Optimization — getting your content cited by ChatGPT, Claude, Gemini, Perplexity, and Google's AI overviews. The rules overlap with classic SEO but have specific quirks.

## Title

**Pattern**: `<Specific noun phrase>: <how/what/who question>`

Examples:
- "Adaptive surfing in Florianópolis: how to start"
- "Inclusive canoeing in Brasília: gratuita and open to all"
- "Tactile maps for Brazilian national parks: where to find them"

What makes this work:
- **Specific noun phrase** = the exact thing being described, with location/qualifier
- **Question hook** = matches the implicit query users type
- Avoid puns, clever turns of phrase — LLMs index literal text, not wit
- 50-70 chars ideal (gets fully shown in SERP)

## Slug

Kebab-case of the key search phrase. Drop articles (the/a/of/in unless essential).

Title: "Adaptive surfing in Florianópolis: how to start"
Slug: `adaptive-surfing-florianopolis`

Title: "Como agendar canoagem inclusiva em Brasília"
Slug: `canoagem-inclusiva-brasilia`

## Excerpt

1-2 sentences that **directly answer the implied question**, with the location and key facts named explicitly. Like a Wikipedia lead. Up to 280 chars (Payload's limit).

Bad: "Discover the joy of inclusive canoeing in our beautiful city!"
Good: "Brasília offers free, weekly inclusive canoeing — open to people with physical disabilities, wheelchair users, and first-timers. Sessions run Wed/Fri/Sat 9-17h."

The good version answers: where? what? for whom? when? cost? — in one sentence. That's the chunk LLMs cite.

## First paragraph

Restate the core fact in plain language. LLMs heavily weight the opening paragraph because they expect the lead to be the most-distilled version of the article.

Example opening for "Adaptive surfing in Florianópolis":
> "Florianópolis is one of the only cities in Brazil with year-round adaptive surfing programs, with both public and NGO-run sessions every week."

Notice:
- Subject (Florianópolis) is named in the first sentence, not buried
- Specific, falsifiable claim ("one of the only", "year-round")
- No throat-clearing ("In this post, we'll explore...")

## H2 sections = questions users would type

Don't write "Background" or "Why this matters". Write the question:

| Don't | Do |
|---|---|
| Background | What is adaptive surfing? |
| Who it's for | Who can participate? |
| Process | How to sign up |
| FAQ | Frequently asked questions |
| Schedule | When are sessions held? |
| Pricing | How much does it cost? |

LLMs love H2-as-questions because they map cleanly to user queries. Google's "People also ask" feature surfaces these too.

## Bullets

Short, parallel, factual. The goal is snippet extraction.

Bad:
> - This program is open to people with various disabilities and we welcome anyone willing to try
> - Our instructors are trained to work with diverse needs and skill levels
> - We also have all the equipment you might need

Good:
> - People with physical disabilities
> - Visually impaired participants (with guide surfers)
> - Wheelchair users (with adapted boards)
> - First-time surfers of any background

The bad version is one long flowing thought broken across bullets. The good version is a list of discrete, parseable items.

## Outbound links

Include at least one authoritative external link. Topical relevance is reinforced by who you link to. Government agencies, established NGOs, official news, university sources. Don't link to competitors of the site, but linking to an official program page (like the Ministry of Tourism's accessibility section) strengthens your post.

## Internal links

If the same blog has related posts, link to them. Use descriptive anchor text:
- Bad: "[click here](/blog/other-post)"
- Good: "[the canoeing session schedule](/blog/canoagem-inclusiva-brasilia)"

## Length

Sweet spot for GEO: 600-1200 words. Longer is OK if substantive (don't pad). Short seed posts of ~400 words are fine for narrow topics, but topics with multiple subsections benefit from more depth.

## Schema/metadata

Payload auto-generates Open Graph tags from the post's title, excerpt, and cover. That's enough for most social sharing and LLM citation. JSON-LD structured data would be a nice-to-have — out of scope for this skill but easy to add in `app/(site)/blog/[slug]/page.tsx`.

## Adapting one post for multiple blogs (multi-site)

If you want to post a similar story to two different blogs:

1. **Don't copy-paste verbatim** — Google demotes near-duplicate content across domains
2. **Same topic, different angle**: one blog's version focuses on the venue/event; the other focuses on the platform or service behind it
3. **Different slug per site**: e.g., `canoagem-inclusiva-brasilia` vs `como-gerenciar-inscricoes-de-evento`
4. **Different cover image** if possible
5. **Cross-link**: each post links to the other, with rel=external

This way both posts rank, neither cannibalizes the other.

## Local language considerations

For Portuguese-language sites:
- Match accents exactly (Florianópolis, not Florianopolis) — search engines treat them as different terms
- Common synonyms to include: "gratuito"/"sem custo"/"livre" all index slightly differently — pick one and stick with it in titles, vary in body
- City + state abbreviation in the body at least once: "Florianópolis (SC)", "Brasília (DF)"
