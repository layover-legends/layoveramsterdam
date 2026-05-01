// Server component — injects JSON-LD into the page.
// Google crawlers read inline scripts; no client JS needed.
export function StructuredData({ data }: { data: object | object[] }) {
  const schemas = Array.isArray(data) ? data : [data];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
    />
  );
}
