import type { Metadata } from "next";
import { MechitzaPreview } from "./MechitzaPreview";
import { MECHITZA_DEFAULT_FINISH, MECHITZA_FINISHES, MECHITZA_MODELS } from "./models";
import {
  MECHITZA_ART_COLORS,
  MECHITZA_DEFAULT_ART_COLOR,
  MECHITZA_DEFAULT_FILM,
  MECHITZA_FILMS,
} from "./options";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Mechitza V10 | Everwood",
  description: "Choose a glass design, wood finish, and artwork color for the Everwood Mechitza. Preview one or three units at full scale.",
};

export default async function MechitzaPage({
  searchParams,
}: {
  searchParams: Promise<{ finish?: string; arrangement?: string; film?: string; art?: string }>;
}) {
  const { finish, arrangement, film, art } = await searchParams;
  const initialFinish = MECHITZA_FINISHES.find(({ id }) => id === finish) ?? MECHITZA_DEFAULT_FINISH;
  const initialModel = MECHITZA_MODELS.find(({ id }) => id === arrangement) ?? MECHITZA_MODELS[0];
  const initialFilm = MECHITZA_FILMS.find(({ id }) => id === film) ?? MECHITZA_DEFAULT_FILM;
  const initialArt = MECHITZA_ART_COLORS.find(({ id }) => id === art) ?? MECHITZA_DEFAULT_ART_COLOR;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a href="https://everwood.shop/" className={styles.wordmark} aria-label="Everwood home">
            Everwood
          </a>
        </div>
      </header>
      <main className={styles.main}>
        <MechitzaPreview
          initialFinish={initialFinish}
          initialModel={initialModel}
          initialFilm={initialFilm}
          initialArt={initialArt}
        />
      </main>
    </div>
  );
}
