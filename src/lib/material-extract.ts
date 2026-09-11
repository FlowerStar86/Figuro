// Reads plain text out of the study files a learner uploads, in the browser.
// Anything we cannot read stays stored as a file and is marked unreadable, so
// the tutor is told honestly that it cannot see inside it.

import type { MaterialKind } from "./figuro-lessons";

export type Extraction = { text: string; extracted: boolean; kind: MaterialKind };

const MAX_CHARS = 60000;

function clean(text: string) {
  return text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_CHARS);
}

async function fromPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  const limit = Math.min(doc.numPages, 60);
  for (let i = 1; i <= limit; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => (typeof item === "object" && "str" in item ? String(item.str) : ""))
      .join(" ");
    pages.push(line);
  }
  return pages.join("\n\n");
}

/** DOCX and PPTX are zipped XML; pull the visible text runs out of them. */
async function fromOfficeZip(file: File, kind: "docx" | "pptx"): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const names = Object.keys(zip.files)
    .filter((n) =>
      kind === "docx"
        ? n === "word/document.xml"
        : n.startsWith("ppt/slides/slide") && n.endsWith(".xml"),
    )
    .sort();
  const chunks: string[] = [];
  for (const name of names) {
    const xml = await zip.files[name]!.async("string");
    const text = xml
      .replace(/<\/a:p>|<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    chunks.push(text);
  }
  return chunks.join("\n\n");
}

export async function extractFile(file: File): Promise<Extraction> {
  const name = file.name.toLowerCase();
  try {
    if (file.type.startsWith("text/") || /\.(txt|md|csv|json|rtf)$/.test(name)) {
      return { text: clean(await file.text()), extracted: true, kind: "file" };
    }
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      const text = clean(await fromPdf(file));
      return { text, extracted: text.length > 40, kind: "file" };
    }
    if (name.endsWith(".docx")) {
      const text = clean(await fromOfficeZip(file, "docx"));
      return { text, extracted: text.length > 20, kind: "file" };
    }
    if (name.endsWith(".pptx")) {
      const text = clean(await fromOfficeZip(file, "pptx"));
      return { text, extracted: text.length > 20, kind: "file" };
    }
  } catch (err) {
    console.error("material extraction failed", err);
  }
  // Images, scans, legacy .doc/.ppt: kept, but Figuro can't read them.
  return { text: "", extracted: false, kind: "file" };
}
