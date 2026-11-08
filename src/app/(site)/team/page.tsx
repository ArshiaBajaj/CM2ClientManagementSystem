import type { Metadata } from "next";
import { PageHero, PeopleGrid, Section } from "@/components/site/ui";
import { BOARD } from "@/content/site";

export const metadata: Metadata = { title: "Board" };

export default function BoardPage() {
  return (
    <>
      <PageHero eyebrow="Board" title="Meet our board.">
        <p>Governance with psychology, psychiatry, and inclusive talent leadership in the mix.</p>
      </PageHero>
      <Section>
        <PeopleGrid people={BOARD} />
      </Section>
    </>
  );
}
