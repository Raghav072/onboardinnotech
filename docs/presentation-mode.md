# INNOTECH presentation mode

The home dashboard is designed to make ONBOARD's core story easy to demonstrate: discover students, explore alumni, browse campus marketplace examples, and find campus information.

## Before presenting

1. Run `npm.cmd install` from the project root if dependencies are not installed.
2. Configure Supabase only in your local `.env.local` file if you intend to demonstrate real authentication or messaging. Never include that file in a shared ZIP.
3. Run `npm.cmd run dev` and open `http://localhost:3000`.
4. The yellow preview banner deliberately identifies sample people and listings. Do not claim sample records are real, purchases are live, or messaging works until those flows have been tested with the configured backend.
5. Rehearse Home → Discover People → Alumni → Marketplace → Campus Info. Keep the home page as your opening and return point.

## What was polished

- High-contrast hero with clear ONBOARD value proposition and primary calls to action.
- Direct feature shortcuts, visually differentiated sample marketplace cards, community profile previews, and a concise campus value panel.
- Global search now submits to the student directory using the existing validated `q` query parameter.
- Sidebar copy no longer references an obsolete milestone.

The sample data is fictional and remains labelled as preview content.
