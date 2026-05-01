import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

marked.use({ gfm: true, breaks: false });

export function renderMarkdown(md: string): string {
  const raw = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(raw);
}
