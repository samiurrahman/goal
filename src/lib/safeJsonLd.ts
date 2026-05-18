/**
 * Serialize an object for embedding inside a `<script type="application/ld+json">` tag.
 *
 * `JSON.stringify` alone is NOT safe inside `<script>`: user-supplied strings
 * containing `</script>` close the tag and let attackers execute arbitrary JS
 * (stored XSS). The HTML parser also breaks on raw `<!--` and `<![CDATA[`.
 * We escape the problematic characters as Unicode escapes, which JSON parsers
 * accept verbatim but the HTML parser never interprets.
 *
 * Also escapes U+2028 / U+2029 — legal in JSON but illegal in JS string
 * literals, so naive `eval(...)`-style pipelines would otherwise break.
 *
 * The U+2028 / U+2029 patterns are built with `new RegExp` so the escape
 * sequences are visible in source — embedding the literal characters would
 * make them invisible and easy to mangle when editing.
 */
const LINE_SEPARATOR = new RegExp('\\u2028', 'g');
const PARAGRAPH_SEPARATOR = new RegExp('\\u2029', 'g');

export const safeJsonLd = (data: unknown): string =>
  JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(LINE_SEPARATOR, '\\u2028')
    .replace(PARAGRAPH_SEPARATOR, '\\u2029');
