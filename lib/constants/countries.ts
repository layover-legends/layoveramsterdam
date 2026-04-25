// ISO 3166-1 alpha-2 country list, curated for the Schiphol-layover audience.
// Covers EU, EEA, top tourism-source markets to NL, and major economies.
// Codes are uppercase per ISO standard. Flags are emoji regional-indicator pairs.
export type Country = {
  code: string; // ISO 3166-1 alpha-2 (uppercase)
  name: string;
  flag: string;
};

// Convert ISO 3166-1 alpha-2 to flag emoji.
export function flagOf(code: string): string {
  if (!code || code.length !== 2) return "";
  const A = 0x1f1e6;
  const a = "A".charCodeAt(0);
  return (
    String.fromCodePoint(A + code.charCodeAt(0) - a) +
    String.fromCodePoint(A + code.charCodeAt(1) - a)
  );
}

const RAW: Array<[string, string]> = [
  ["AR", "Argentina"],
  ["AU", "Australia"],
  ["AT", "Austria"],
  ["BE", "Belgium"],
  ["BR", "Brazil"],
  ["BG", "Bulgaria"],
  ["CA", "Canada"],
  ["CL", "Chile"],
  ["CN", "China"],
  ["CO", "Colombia"],
  ["HR", "Croatia"],
  ["CY", "Cyprus"],
  ["CZ", "Czechia"],
  ["DK", "Denmark"],
  ["EG", "Egypt"],
  ["EE", "Estonia"],
  ["FI", "Finland"],
  ["FR", "France"],
  ["DE", "Germany"],
  ["GH", "Ghana"],
  ["GR", "Greece"],
  ["HK", "Hong Kong"],
  ["HU", "Hungary"],
  ["IS", "Iceland"],
  ["IN", "India"],
  ["ID", "Indonesia"],
  ["IE", "Ireland"],
  ["IL", "Israel"],
  ["IT", "Italy"],
  ["JP", "Japan"],
  ["JO", "Jordan"],
  ["KE", "Kenya"],
  ["LV", "Latvia"],
  ["LB", "Lebanon"],
  ["LT", "Lithuania"],
  ["LU", "Luxembourg"],
  ["MY", "Malaysia"],
  ["MT", "Malta"],
  ["MX", "Mexico"],
  ["MA", "Morocco"],
  ["NL", "Netherlands"],
  ["NZ", "New Zealand"],
  ["NG", "Nigeria"],
  ["NO", "Norway"],
  ["PK", "Pakistan"],
  ["PE", "Peru"],
  ["PH", "Philippines"],
  ["PL", "Poland"],
  ["PT", "Portugal"],
  ["QA", "Qatar"],
  ["RO", "Romania"],
  ["RU", "Russia"],
  ["SA", "Saudi Arabia"],
  ["SN", "Senegal"],
  ["RS", "Serbia"],
  ["SG", "Singapore"],
  ["SK", "Slovakia"],
  ["SI", "Slovenia"],
  ["ZA", "South Africa"],
  ["KR", "South Korea"],
  ["ES", "Spain"],
  ["SE", "Sweden"],
  ["CH", "Switzerland"],
  ["TW", "Taiwan"],
  ["TH", "Thailand"],
  ["TR", "Turkey"],
  ["UA", "Ukraine"],
  ["AE", "United Arab Emirates"],
  ["GB", "United Kingdom"],
  ["US", "United States"],
  ["UY", "Uruguay"],
  ["VN", "Vietnam"],
];

export const COUNTRIES: ReadonlyArray<Country> = RAW.map(([code, name]) => ({
  code,
  name,
  flag: flagOf(code),
})).sort((a, b) => a.name.localeCompare(b.name));

export const COUNTRY_CODES: ReadonlySet<string> = new Set(
  COUNTRIES.map((c) => c.code),
);

export function getCountry(code: string | null | undefined) {
  if (!code) return null;
  return COUNTRIES.find((c) => c.code === code.toUpperCase()) ?? null;
}
