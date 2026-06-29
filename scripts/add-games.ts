/**
 * Adds games by title that aren't tied to a Steam library sync (console
 * exclusives, etc.) — looked up via IGDB's free-text search, taking the
 * top match for each title. Skips a title if it's already in the DB
 * (matched by igdbId) or if IGDB has no match for it.
 *
 * Run with: npx tsx scripts/add-games.ts "Title One" "Title Two" ...
 * With no args, adds a small default list of popular non-Steam titles.
 */
import { prisma } from "@/lib/prisma";
import { searchGamesByName, igdbImageUrl, type IgdbGame } from "@/lib/igdb";

const COMBINING_MARKS = /[̀-ͯ]/g;

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(COMBINING_MARKS, "") // strip combining accents (e.g. ö -> o)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * IGDB's search relevance can surface bundles or unrelated titles ahead of
 * the exact game (confirmed: "God of War Ragnarök" once ranked an unrelated
 * "Ragnarok: War of Gods" first). Prefer an exact normalized-name match
 * among the top results; only fall back to the top hit if nothing matches
 * exactly, and flag that case so it can be eyeballed.
 */
function pickBestMatch(query: string, candidates: IgdbGame[]): { game: IgdbGame; exact: boolean } | null {
  if (candidates.length === 0) return null;
  const target = normalize(query);
  const exact = candidates.find((c) => normalize(c.name) === target);
  return exact ? { game: exact, exact: true } : { game: candidates[0], exact: false };
}

const DEFAULT_TITLES = [
  "The Legend of Zelda: Breath of the Wild",
  "The Legend of Zelda: Tears of the Kingdom",
  "Super Mario Odyssey",
  "Mario Kart 8 Deluxe",
  "Animal Crossing: New Horizons",
  "Super Smash Bros. Ultimate",
  "God of War Ragnarök",
  "Marvel's Spider-Man 2",
  "The Last of Us Part II",
  "Bloodborne",
  "Pokémon Scarlet",
  "Splatoon 3",
];

async function main() {
  const titles = process.argv.slice(2);
  const list = titles.length > 0 ? titles : DEFAULT_TITLES;

  console.log(`Adding ${list.length} game(s)...`);

  let added = 0;
  let skipped = 0;
  for (const title of list) {
    const matches = await searchGamesByName(title);
    const best = pickBestMatch(title, matches);

    if (!best) {
      console.log(`  skip (no IGDB match): ${title}`);
      skipped++;
      await new Promise((r) => setTimeout(r, 300));
      continue;
    }
    const { game: igdbGame, exact } = best;
    if (!exact) {
      console.log(`  ⚠ no exact match for "${title}" — using closest hit "${igdbGame.name}", verify this is right`);
    }

    const existing = await prisma.game.findUnique({ where: { igdbId: igdbGame.id } });
    if (existing) {
      console.log(`  skip (already in DB): ${igdbGame.name}`);
      skipped++;
      await new Promise((r) => setTimeout(r, 300));
      continue;
    }

    await prisma.game.create({
      data: {
        igdbId: igdbGame.id,
        slug: `igdb-${igdbGame.id}`,
        title: igdbGame.name,
        description: igdbGame.summary,
        headerImage: igdbGame.cover?.image_id
          ? igdbImageUrl(igdbGame.cover.image_id, "t_cover_big")
          : undefined,
        metadata: JSON.parse(JSON.stringify(igdbGame)),
      },
    });
    added++;
    console.log(`  added: ${igdbGame.name} (matched from "${title}")`);

    // IGDB enforces 4 req/sec; this does 1 request per title.
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`Done. Added ${added}, skipped ${skipped} of ${list.length}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
