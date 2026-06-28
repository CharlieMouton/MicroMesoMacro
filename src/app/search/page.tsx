import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SearchBar } from "../search-bar";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  const games = query
    ? await prisma.game.findMany({
        where: { title: { contains: query, mode: "insensitive" } },
        select: { id: true, title: true, headerImage: true },
        take: 30,
        orderBy: { title: "asc" },
      })
    : [];

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "38px 24px 64px" }}>
      <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em" }}>Search</h2>
      <div style={{ marginTop: 18 }}>
        <SearchBar defaultValue={query} />
      </div>

      {query && (
        <div style={{ marginTop: 28 }}>
          <p style={{ fontSize: 12, color: "var(--text-faint)", letterSpacing: ".06em" }}>
            {games.length} result{games.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
            {games.map((game) => (
              <Link
                key={game.id}
                href={`/games/${game.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  background: "var(--panel)",
                  border: "1px solid var(--border-dim)",
                  borderRadius: 6,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 4,
                    flex: "none",
                    position: "relative",
                    overflow: "hidden",
                    background: "linear-gradient(135deg, var(--micro-dim) -20%, #0e0e14 65%)",
                  }}
                >
                  {game.headerImage && (
                    <Image src={game.headerImage} alt="" fill sizes="44px" style={{ objectFit: "cover" }} />
                  )}
                </div>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{game.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
