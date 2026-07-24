/**
 * Pulls real, usable files out of a markdown reply's fenced code blocks —
 * e.g. ```html ... ``` — so they can be shown as a live preview and packaged
 * into a real downloadable ZIP, instead of the model trying (and failing) to
 * hand-roll a fake base64 zip in plain text.
 */

const FENCE_RE = /```(\w+)?\n([\s\S]*?)```/g;
const FILENAME_COMMENT_RE =
  /^\s*(?:<!--\s*([\w./-]+\.\w+)\s*-->|\/\*\s*([\w./-]+\.\w+)\s*\*\/|\/\/\s*([\w./-]+\.\w+))\s*\n/;

const CODE_LANGS = new Set(["html", "css", "js", "javascript"]);
const DEFAULT_NAMES = { html: "index.html", css: "styles.css", js: "script.js", javascript: "script.js" };

function escapeForRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractCodeFiles(markdown) {
  if (!markdown) return [];
  const files = [];
  const used = new Set();
  let match;

  FENCE_RE.lastIndex = 0;
  while ((match = FENCE_RE.exec(markdown)) !== null) {
    const lang = (match[1] || "").toLowerCase();
    if (!CODE_LANGS.has(lang)) continue;

    let content = match[2];
    let name;

    const nameMatch = content.match(FILENAME_COMMENT_RE);
    if (nameMatch) {
      name = nameMatch[1] || nameMatch[2] || nameMatch[3];
      content = content.slice(nameMatch[0].length);
    } else {
      const base = DEFAULT_NAMES[lang] || `file.${lang}`;
      name = base;
      let i = 2;
      while (used.has(name)) {
        const dot = base.lastIndexOf(".");
        name = `${base.slice(0, dot)}${i}${base.slice(dot)}`;
        i++;
      }
    }

    used.add(name);
    files.push({ name, content: content.trim(), lang: lang === "javascript" ? "js" : lang });
  }

  return files;
}

/** Combine extracted files into a single previewable HTML document (inlines CSS/JS). */
export function buildPreviewHtml(files) {
  const htmlFile = files.find((f) => f.name.endsWith(".html")) || files.find((f) => f.lang === "html");
  if (!htmlFile) return null;

  let html = htmlFile.content;

  files
    .filter((f) => f.name.endsWith(".css"))
    .forEach((cssFile) => {
      const linkRe = new RegExp(`<link[^>]*href=["']${escapeForRegex(cssFile.name)}["'][^>]*>`, "i");
      const styleBlock = `<style>\n${cssFile.content}\n</style>`;
      html = linkRe.test(html) ? html.replace(linkRe, styleBlock) : html.replace(/<\/head>/i, `${styleBlock}\n</head>`);
    });

  files
    .filter((f) => f.name.endsWith(".js"))
    .forEach((jsFile) => {
      const scriptRe = new RegExp(`<script[^>]*src=["']${escapeForRegex(jsFile.name)}["'][^>]*></script>`, "i");
      const scriptBlock = `<script>\n${jsFile.content}\n</script>`;
      html = scriptRe.test(html)
        ? html.replace(scriptRe, scriptBlock)
        : html.replace(/<\/body>/i, `${scriptBlock}\n</body>`);
    });

  return html;
}