import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MechitzaPreview } from "./MechitzaPreview";
import { MECHITZA_FINISHES, MECHITZA_MODELS } from "./models";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Mechitza V10 | Everwood",
  description: "Explore the Everwood Mechitza with Linen Marquetry privacy film and preview one or three units at full scale.",
};

export default async function MechitzaPage({
  searchParams,
}: {
  searchParams: Promise<{ finish?: string; arrangement?: string }>;
}) {
  const { finish, arrangement } = await searchParams;
  const initialFinish = MECHITZA_FINISHES.find(({ id }) => id === finish) ?? MECHITZA_FINISHES[0];
  const initialModel = MECHITZA_MODELS.find(({ id }) => id === arrangement) ?? MECHITZA_MODELS[0];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/welcome" className={styles.wordmark} aria-label="Everwood home">Everwood</Link>
          <Link href="/viewer" className={styles.viewerLink}>
            Artwork viewer <ArrowUpRight size={15} aria-hidden />
          </Link>
        </div>
      </header>
      <main className={styles.main}>
        <MechitzaPreview initialFinish={initialFinish} initialModel={initialModel} />
      </main>
    </div>
  );
}
