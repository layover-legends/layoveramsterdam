import { describe, it, expect } from "vitest";
import { buildBundle, tr } from "@/lib/i18n/translate";

// ─── fixtures ────────────────────────────────────────────────────────────────

const TOUR_ID = "tour-001";
const DEST_ID_WITH_EN = "dest-001"; // top-50 destination with EN translation
const DEST_ID_NO_EN = "dest-002";   // remaining destination, no EN translation

/** Simulated rows as they come from the translations table. */
const ROWS = [
  // Tour: source language is EN; translations exist in FR, DE, ES but NOT EN.
  { entity_type: "tour", entity_id: TOUR_ID, field: "description", language: "fr", value: "Circuit des canaux — version française" },
  { entity_type: "tour", entity_id: TOUR_ID, field: "description", language: "de", value: "Kanal-Tour — Deutsche Version" },
  { entity_type: "tour", entity_id: TOUR_ID, field: "description", language: "es", value: "Tour de canales — versión española" },

  // Destination #1: source language is FR; EN translation exists.
  { entity_type: "destination", entity_id: DEST_ID_WITH_EN, field: "description", language: "en", value: "Historic heart — Palais Royal, 700 years of history." },
  { entity_type: "destination", entity_id: DEST_ID_WITH_EN, field: "name", language: "en", value: "Dam Square" },

  // Destination #2: source language is FR; NO EN translation.
  // (No rows for DEST_ID_NO_EN at all.)
];

// Source column values (what the entity table itself contains).
const TOUR_SOURCE_EN = "Canal Walk — curated Amsterdam layover tour."; // English source
const DEST_SOURCE_FR_1 = "Cœur historique — Palais Royal, 700 ans d'histoire."; // French source
const DEST_SOURCE_FR_2 = "Élu plus beau canal par les Amsterdamois eux-mêmes."; // French source (no EN translation)

// ─── buildBundle ─────────────────────────────────────────────────────────────

describe("buildBundle", () => {
  it("only includes rows for the exact requested locale", () => {
    const bundle = buildBundle(ROWS, "fr");
    // FR translation for the tour should be in the bundle
    expect(bundle.get(`tour:${TOUR_ID}:description`)).toBe("Circuit des canaux — version française");
    // EN translation for destination should NOT bleed into the FR bundle
    expect(bundle.get(`destination:${DEST_ID_WITH_EN}:description`)).toBeUndefined();
  });

  it("returns an empty bundle when no rows match the locale", () => {
    const bundle = buildBundle(ROWS, "en");
    // No EN translation exists for the tour — bundle should be empty for it
    expect(bundle.get(`tour:${TOUR_ID}:description`)).toBeUndefined();
    // EN translation exists for DEST_ID_WITH_EN
    expect(bundle.get(`destination:${DEST_ID_WITH_EN}:description`)).toBe(
      "Historic heart — Palais Royal, 700 years of history.",
    );
  });

  it("does not include rows from fallback-chain languages", () => {
    // When locale=nl, rows in EN should NOT enter the bundle even though
    // FALLBACK_CHAIN['nl'] = ['en'].  That logic must not live in buildBundle.
    const bundle = buildBundle(ROWS, "nl");
    expect(bundle.size).toBe(0); // no NL rows in fixtures
  });
});

// ─── tr() ────────────────────────────────────────────────────────────────────

describe("tr", () => {
  const tourEntity = { entity_type: "tour", entity_id: TOUR_ID };
  const destEntity1 = { entity_type: "destination", entity_id: DEST_ID_WITH_EN };
  const destEntity2 = { entity_type: "destination", entity_id: DEST_ID_NO_EN };

  describe("locale = en", () => {
    const bundle = buildBundle(ROWS, "en");

    it("TOUR: no EN translation → falls back to English source row", () => {
      // This is the primary bug scenario: tours have FR/DE/ES but no EN.
      // The resolver must NOT show the FR translation by accident.
      const result = tr(bundle, tourEntity, "description", TOUR_SOURCE_EN);
      expect(result).toBe(TOUR_SOURCE_EN);
      expect(result).not.toContain("française");
    });

    it("DEST with EN translation → returns EN translation", () => {
      const result = tr(bundle, destEntity1, "description", DEST_SOURCE_FR_1);
      expect(result).toBe("Historic heart — Palais Royal, 700 years of history.");
    });

    it("DEST without EN translation → falls back to FR source row, not a hardcoded string", () => {
      // The remaining 169 destinations have no EN translation.
      // Must return the source column (French) as fallback, not a placeholder.
      const result = tr(bundle, destEntity2, "description", DEST_SOURCE_FR_2);
      expect(result).toBe(DEST_SOURCE_FR_2);
      // Must NOT be a hardcoded English string like "No description"
      expect(result).not.toBe("No description");
      expect(result).not.toBe("");
    });
  });

  describe("locale = fr", () => {
    const bundle = buildBundle(ROWS, "fr");

    it("TOUR: FR translation exists → returns FR translation", () => {
      const result = tr(bundle, tourEntity, "description", TOUR_SOURCE_EN);
      expect(result).toBe("Circuit des canaux — version française");
    });

    it("DEST with only EN translation → FR bundle is empty → falls back to FR source row", () => {
      // A French user viewing a destination that has an EN translation but no FR
      // translation must see the source (French), not the English translation.
      // Old bug: FALLBACK_CHAIN['fr'] = ['en'] caused the EN translation to
      // appear in the FR bundle, showing English to French speakers.
      const result = tr(bundle, destEntity1, "description", DEST_SOURCE_FR_1);
      expect(result).toBe(DEST_SOURCE_FR_1); // source is already French ✓
      expect(result).not.toContain("Historic heart"); // must NOT show English
    });

    it("DEST with no translation at all → falls back to FR source row", () => {
      const result = tr(bundle, destEntity2, "description", DEST_SOURCE_FR_2);
      expect(result).toBe(DEST_SOURCE_FR_2);
    });
  });

  describe("locale = de", () => {
    const bundle = buildBundle(ROWS, "de");

    it("TOUR: DE translation exists → returns DE translation", () => {
      const result = tr(bundle, tourEntity, "description", TOUR_SOURCE_EN);
      expect(result).toBe("Kanal-Tour — Deutsche Version");
    });

    it("DEST: no DE translation → falls back to source row", () => {
      // Neither EN nor FR should bleed into the DE bundle.
      const result = tr(bundle, destEntity1, "description", DEST_SOURCE_FR_1);
      expect(result).toBe(DEST_SOURCE_FR_1); // falls back to French source
      expect(result).not.toContain("Historic heart");
    });
  });

  describe("locale = es", () => {
    const bundle = buildBundle(ROWS, "es");

    it("TOUR: ES translation exists → returns ES translation", () => {
      const result = tr(bundle, tourEntity, "description", TOUR_SOURCE_EN);
      expect(result).toBe("Tour de canales — versión española");
    });

    it("DEST: no ES translation → falls back to source row (not EN or FR translation)", () => {
      // Old FALLBACK_CHAIN['es'] = ['en', 'fr'] would have picked up EN translation here.
      const result = tr(bundle, destEntity1, "description", DEST_SOURCE_FR_1);
      expect(result).toBe(DEST_SOURCE_FR_1);
      expect(result).not.toContain("Historic heart");
    });
  });
});
