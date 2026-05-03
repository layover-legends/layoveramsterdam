// Server component — injects JSON-LD into the page.
// Google crawlers read inline scripts; no client JS needed.
//
// SEC-15: escape `<` as `<` so a DB field containing `</script>` cannot
// break out of the script tag and inject arbitrary HTML.
export function StructuredData({ data }: { data: object | object[] }) {
  const schemas = Array.isArray(data) ? data : [data];
  const json = JSON.stringify(schemas).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
