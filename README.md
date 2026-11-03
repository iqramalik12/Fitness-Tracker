<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/8f25e06b-67c8-4697-b6af-cb4f0569e51b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` to your Gemini API key (without it the AI Coach shows offline tips)
3. Run the app:
   `npm run dev`

## Modules

- **Diet → Meal Tracking**: log Pakistani home food (roti, daal, karahi, biryani, chai...) with everyday portions (small/medium/large roti, half/full bowl, half/full plate, cups, tablespoons, or grams). Includes nutrition dashboard and 30-day history. The food database lives in `src/lib/foods.ts`; all values are estimates.
- **AI Coach → Daily Goals / Progress / Reminders**: goals and coach messages are built from the user's own logs. Weight trends compare multi-week averages, so normal daily swings are not treated as a plateau.
- **BMI**: calculate for yourself or anyone else (no account needed for them). Saved results for other people are kept separate from your own history. Adult categories only apply from age 20.

`GEMINI_API_KEY` (server-side only) powers the coach chat, AI goal/motivation wording, meal photo recognition and "estimate with AI". Without it, goals and motivation fall back to built-in rules, and photo/AI estimates are disabled. Manual and database logging always work.
