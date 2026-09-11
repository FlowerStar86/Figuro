import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Page, PageHeading, Panel } from "@/components/figuro/section";
import { useFiguroSession } from "@/lib/figuro-session";
import { MATERIAL_LABEL, childFolders, folderPath, type MaterialKind } from "@/lib/figuro-lessons";
import { extractFile } from "@/lib/material-extract";
import { signedMaterialUrl, uploadMaterialFile } from "@/lib/figuro-store";

export const Route = createFileRoute("/_authenticated/lessons")({
  head: () => ({
    meta: [
      { title: "My Lessons and materials — Figuro" },
      {
        name: "description",
        content:
          "Organise your subjects and units, keep every lesson with its own progress, and add your own slides, notes and readings for the tutor to teach from.",
      },
      { property: "og:title", content: "My Lessons and materials — Figuro" },
      {
        property: "og:description",
        content: "Subjects, units, lessons and your own study materials, all in one place.",
      },
    ],
  }),
  component: LessonsPage,
});

function LessonsPage() {
  const {
    folders,
    lessons,
    activeLessonId,
    selectLesson,
    addLesson,
    editLesson,
    removeLesson,
    addFolder,
    renameFolder,
    removeFolder,
    materials,
    addMaterial,
    removeMaterial,
    userId,
    loading,
  } = useFiguroSession();
  const navigate = useNavigate();

  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonSubject, setLessonSubject] = useState("");
  const [folderName, setFolderName] = useState("");
  const [materialLessonId, setMaterialLessonId] = useState<string | null>(null);

  const visibleFolders = useMemo(
    () => childFolders(folders, openFolderId),
    [folders, openFolderId],
  );
  const visibleLessons = useMemo(
    () => lessons.filter((l) => (l.folderId ?? null) === openFolderId),
    [lessons, openFolderId],
  );
  const trail = folderPath(folders, openFolderId);

  function open(id: string) {
    selectLesson(id);
    void navigate({ to: "/learn" });
  }

  if (loading) {
    return (
      <Page>
        <p className="py-16 text-center text-sm text-muted-foreground">Loading your shelf…</p>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeading
        eyebrow="My Lessons"
        title="Your learning shelf"
        description="Group your work the way you like — a subject, a unit inside it, lessons inside that. Add your own slides and notes so the tutor teaches from what you're actually studying."
      />

      {/* Breadcrumb */}
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm" aria-label="Folder path">
        <button
          type="button"
          onClick={() => setOpenFolderId(null)}
          className={`rounded-lg px-2 py-1 font-medium ${openFolderId === null ? "bg-surface" : "text-muted-foreground hover:text-foreground"}`}
        >
          All subjects
        </button>
        {trail.map((f) => (
          <span key={f.id} className="flex items-center gap-1">
            <span className="text-muted-foreground">/</span>
            <button
              type="button"
              onClick={() => setOpenFolderId(f.id)}
              className={`rounded-lg px-2 py-1 font-medium ${openFolderId === f.id ? "bg-surface" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f.name}
            </button>
          </span>
        ))}
      </nav>

      {/* Create folder + lesson here */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!folderName.trim()) return;
            void addFolder(folderName.trim(), openFolderId);
            setFolderName("");
          }}
          className="flex gap-2"
        >
          <input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder={openFolderId ? "New folder, e.g. Unit 1" : "New subject, e.g. Biology"}
            aria-label="New folder name"
            className="min-w-0 flex-1 rounded-xl bg-card px-4 py-3 text-base ring-1 ring-border outline-none focus:ring-primary"
          />
          <button
            type="submit"
            className="rounded-xl bg-card px-4 py-3 text-sm font-medium ring-1 ring-border hover:bg-surface"
          >
            Add folder
          </button>
        </form>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!lessonTitle.trim()) return;
            void addLesson(lessonTitle.trim(), lessonSubject.trim() || undefined, openFolderId);
            setLessonTitle("");
            setLessonSubject("");
          }}
          className="flex gap-2"
        >
          <input
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
            placeholder="New lesson, e.g. Photosynthesis"
            aria-label="New lesson title"
            className="min-w-0 flex-1 rounded-xl bg-card px-4 py-3 text-base ring-1 ring-border outline-none focus:ring-primary"
          />
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground ring-1 ring-primary hover:opacity-90"
          >
            Add lesson
          </button>
        </form>
      </div>

      {/* Folders here */}
      {visibleFolders.length > 0 && (
        <ul className="mb-8 grid gap-3 sm:grid-cols-2">
          {visibleFolders.map((f) => {
            const inside =
              lessons.filter((l) => l.folderId === f.id).length + childFolders(folders, f.id).length;
            return (
              <li key={f.id}>
                <Panel className="flex items-center justify-between gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => setOpenFolderId(f.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-base font-medium">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {inside} {inside === 1 ? "item" : "items"} inside
                    </p>
                  </button>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const next = window.prompt("Rename folder", f.name);
                        if (next?.trim()) void renameFolder(f.id, next.trim());
                      }}
                      className="rounded-lg px-2 py-1 text-xs font-medium ring-1 ring-border hover:bg-surface"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete "${f.name}"? Lessons inside stay in your shelf.`))
                          void removeFolder(f.id);
                      }}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-destructive ring-1 ring-border hover:bg-surface"
                    >
                      Delete
                    </button>
                  </div>
                </Panel>
              </li>
            );
          })}
        </ul>
      )}

      {/* Lessons here */}
      {visibleLessons.length === 0 && visibleFolders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-muted-foreground">
          Nothing here yet. Add a subject folder, or start a lesson straight away.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {visibleLessons.map((lesson) => {
            const lessonMaterials = materials.filter((m) => m.lessonId === lesson.id);
            const showMaterials = materialLessonId === lesson.id;
            return (
              <li key={lesson.id}>
                <div
                  className={`rounded-2xl bg-card p-5 ring-1 ${
                    lesson.id === activeLessonId ? "ring-2 ring-primary" : "ring-border"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: `var(--${lesson.accent})` }}
                      aria-hidden
                    />
                    <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                      {lesson.discipline}
                    </span>
                    {lesson.id === activeLessonId && (
                      <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold tracking-wide text-secondary-foreground uppercase">
                        Active
                      </span>
                    )}
                  </div>

                  <button type="button" onClick={() => open(lesson.id)} className="block text-left">
                    <h2 className="text-lg font-medium">{lesson.title}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{lesson.lastActivity}</p>
                  </button>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${lesson.progress}%`,
                          backgroundColor: `var(--${lesson.accent})`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium tabular-nums">{lesson.progress}%</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => open(lesson.id)}
                      className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground ring-1 ring-primary"
                    >
                      {lesson.progress > 0 ? "Continue" : "Start"}
                    </button>
                    {(["practice", "solve"] as const).map((dest) => (
                      <button
                        key={dest}
                        type="button"
                        onClick={() => {
                          selectLesson(lesson.id);
                          void navigate({ to: `/${dest}` });
                        }}
                        className="rounded-full bg-card px-3 py-1 text-xs font-medium capitalize ring-1 ring-border hover:bg-secondary"
                      >
                        {dest}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setMaterialLessonId(showMaterials ? null : lesson.id)}
                      className="rounded-full bg-card px-3 py-1 text-xs font-medium ring-1 ring-border hover:bg-secondary"
                    >
                      Materials ({lessonMaterials.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = window.prompt("Rename lesson", lesson.title);
                        if (next?.trim()) void editLesson(lesson.id, { title: next.trim() });
                      }}
                      className="rounded-full px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete "${lesson.title}" and its history?`))
                          void removeLesson(lesson.id);
                      }}
                      className="rounded-full px-3 py-1 text-xs font-medium text-destructive hover:opacity-80"
                    >
                      Delete
                    </button>
                  </div>

                  {/* Move between folders */}
                  <label className="mt-4 block text-xs text-muted-foreground">
                    Folder
                    <select
                      value={lesson.folderId ?? ""}
                      onChange={(e) =>
                        void editLesson(lesson.id, { folderId: e.target.value || null })
                      }
                      className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-sm text-foreground ring-1 ring-border outline-none focus:ring-primary"
                    >
                      <option value="">No folder</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {folderPath(folders, f.id)
                            .map((x) => x.name)
                            .join(" / ")}
                        </option>
                      ))}
                    </select>
                  </label>

                  {showMaterials && (
                    <MaterialsPanel
                      lessonId={lesson.id}
                      userId={userId}
                      items={lessonMaterials}
                      onAdd={addMaterial}
                      onRemove={removeMaterial}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}

type MaterialsPanelProps = {
  lessonId: string;
  userId: string | null;
  items: ReturnType<typeof useFiguroSession>["materials"];
  onAdd: ReturnType<typeof useFiguroSession>["addMaterial"];
  onRemove: ReturnType<typeof useFiguroSession>["removeMaterial"];
};

/** Slides, notes, links and pasted text a learner attaches to one lesson. */
function MaterialsPanel({ lessonId, userId, items, onAdd, onRemove }: MaterialsPanelProps) {
  const [kind, setKind] = useState<MaterialKind>("note");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function addTyped(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !title.trim()) return;
    setBusy(true);
    setStatus(null);
    try {
      const isLink = kind === "link" || kind === "video";
      await onAdd({
        lessonId,
        kind,
        title: title.trim(),
        content: isLink ? null : body.trim() || null,
        url: isLink ? body.trim() : null,
        extracted: isLink ? false : body.trim().length > 0,
      });
      setTitle("");
      setBody("");
    } catch {
      setStatus("Couldn't save that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function addFile(file: File) {
    if (!userId) return;
    setBusy(true);
    setStatus(`Reading ${file.name}…`);
    try {
      const [{ text, extracted }, path] = await Promise.all([
        extractFile(file),
        uploadMaterialFile(userId, file),
      ]);
      await onAdd({
        lessonId,
        kind: "file",
        title: file.name,
        content: text || null,
        storagePath: path,
        mimeType: file.type || null,
        extracted,
      });
      setStatus(
        extracted
          ? `Added ${file.name} — the tutor can read it.`
          : `Added ${file.name}, but Figuro can't read the text inside it, so it won't pretend to.`,
      );
    } catch {
      setStatus("Couldn't upload that file. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl bg-surface p-4">
      <p className="mb-3 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        Study materials
      </p>

      {items.length > 0 && (
        <ul className="mb-4 space-y-2">
          {items.map((m) => (
            <li key={m.id} className="flex items-center gap-2 text-sm">
              <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ring-1 ring-border">
                {MATERIAL_LABEL[m.kind]}
              </span>
              <span className="min-w-0 flex-1 truncate">{m.title}</span>
              {!m.extracted && (
                <span className="shrink-0 text-[10px] text-muted-foreground">not readable</span>
              )}
              {m.storagePath && (
                <button
                  type="button"
                  onClick={async () => {
                    const url = await signedMaterialUrl(m.storagePath!);
                    if (url) window.open(url, "_blank", "noopener");
                  }}
                  className="shrink-0 text-xs underline underline-offset-2"
                >
                  Open
                </button>
              )}
              <button
                type="button"
                onClick={() => void onRemove(m)}
                className="shrink-0 text-xs text-destructive"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(e) => void addTyped(e)} className="grid gap-2">
        <div className="flex gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as MaterialKind)}
            aria-label="Material type"
            className="rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-primary"
          >
            <option value="note">Note</option>
            <option value="text">Pasted text</option>
            <option value="flashcards">Flashcards</option>
            <option value="link">Link</option>
            <option value="video">Video link</option>
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title, e.g. Lecture 3 notes"
            aria-label="Material title"
            className="min-w-0 flex-1 rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-primary"
          />
        </div>
        <textarea
          rows={kind === "link" || kind === "video" ? 1 : 4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={kind === "link" || kind === "video" ? "https://…" : "Paste your notes or text here"}
          aria-label="Material content"
          className="w-full resize-y rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-primary"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground ring-1 ring-primary disabled:opacity-40"
          >
            Add material
          </button>
          <label className="cursor-pointer rounded-lg bg-card px-3 py-2 text-xs font-medium ring-1 ring-border hover:bg-secondary">
            Upload a file
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.docx,.pptx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void addFile(file);
              }}
            />
          </label>
          <span className="text-[11px] text-muted-foreground">
            PDF, Word, PowerPoint, text and images (up to 25 MB)
          </span>
        </div>
      </form>

      {status && <p className="mt-2 text-xs text-muted-foreground">{status}</p>}
    </div>
  );
}
