import { useState, type ReactNode } from "react";
import { Volume2, VolumeX } from "lucide-react";

export function stripEmojis(str: string): string {
  if (!str) return "";
  return str
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2000}-\u{32FF}\u{1F900}-\u{1F9FF}\u{1F000}-\u{1F02F}]/gu, "")
    .replace(/[🔀🌱🌿🎉💡📊🔹⚡🛡️🎧🎮📝←→🔄⚠️]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Enhanced renderer for tutor replies: keeps paragraph breaks,
 * renders headings, bold text, clean links, and strips raw markdown symbols.
 */
export function TutorText({ text, removeEmojis = false }: { text: string; removeEmojis?: boolean }) {
  const displayText = removeEmojis ? stripEmojis(text) : text;
  const isAudioLesson = !removeEmojis && (text.includes("🎧") || text.includes("Audio Lesson"));
  const isVisualCard = !removeEmojis && (text.includes("📊") || text.includes("🔹"));

  return (
    <div className="space-y-3">
      {isAudioLesson && <AudioControlBlock text={displayText} />}
      {isVisualCard ? (
        <VisualDiagramCard text={displayText} />
      ) : (
        <div className="space-y-2">
          {displayText.split(/\n{2,}/).filter(Boolean).map((block, i) => (
            <MarkdownBlock key={i} block={block} removeEmojis={removeEmojis} />
          ))}
        </div>
      )}
    </div>
  );
}

function MarkdownBlock({ block, removeEmojis }: { block: string; removeEmojis?: boolean }) {
  const lines = block.split(/\n/);
  return (
    <div className="space-y-1">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Divider
        if (/^(---|[*]{3}|___)$/.test(trimmed)) {
          return <hr key={idx} className="my-2 border-border/40" />;
        }

        // Headings
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-base font-bold text-foreground mt-2 mb-1">
              {renderInline(trimmed.slice(4), removeEmojis)}
            </h3>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={idx} className="text-lg font-bold text-foreground mt-2 mb-1">
              {renderInline(trimmed.slice(3), removeEmojis)}
            </h2>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={idx} className="text-xl font-bold text-foreground mt-2 mb-1">
              {renderInline(trimmed.slice(2), removeEmojis)}
            </h1>
          );
        }

        // List item
        if (/^[-*•]\s+/.test(trimmed)) {
          const content = trimmed.replace(/^[-*•]\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-2 ml-2 text-base leading-relaxed">
              <span className="select-none text-muted-foreground">•</span>
              <div>{renderInline(content, removeEmojis)}</div>
            </div>
          );
        }

        return (
          <p key={idx} className="text-base leading-relaxed whitespace-pre-wrap text-pretty">
            {renderInline(line, removeEmojis)}
          </p>
        );
      })}
    </div>
  );
}

function AudioControlBlock({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false);

  function toggleSpeech() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
    } else {
      window.speechSynthesis.cancel();
      const cleanSpeechText = stripEmojis(text.replace(/[*#]/g, ""));
      const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
      utterance.rate = 0.95;
      utterance.onend = () => setPlaying(false);
      utterance.onerror = () => setPlaying(false);
      window.speechSynthesis.speak(utterance);
      setPlaying(true);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/10 p-3 border border-primary/20">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-primary">Audio Lesson Mode</span>
      </div>
      <button
        type="button"
        onClick={toggleSpeech}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        {playing ? (
          <>
            <VolumeX className="size-3.5" /> Stop Audio
          </>
        ) : (
          <>
            <Volume2 className="size-3.5" /> Play Audio
          </>
        )}
      </button>
    </div>
  );
}

function VisualDiagramCard({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="rounded-2xl bg-surface p-5 border border-border shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
          Visual Concept Diagram & Card
        </span>
        <span className="text-[10px] bg-primary/10 px-2 py-0.5 rounded-full text-primary font-medium">
          Interactive Diagram
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {blocks.map((block, idx) => {
          if (block.includes("Diagram")) {
            return (
              <div key={idx} className="sm:col-span-2 text-base font-semibold text-foreground">
                {renderInline(block)}
              </div>
            );
          }

          return (
            <div
              key={idx}
              className="rounded-xl bg-card p-4 ring-1 ring-border hover:ring-primary/40 transition-all"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-sm font-semibold text-foreground">
                  {stripEmojis(block.split("\n")[0]?.replace(/[*#]/g, "") || "")}
                </p>
              </div>
              <div className="text-xs leading-relaxed text-muted-foreground space-y-1">
                {block.split("\n").slice(1).map((line, lIdx) => (
                  <p key={lIdx}>{renderInline(line)}</p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function renderInline(text: string, removeEmojis = false): ReactNode[] {
  const cleaned = removeEmojis ? stripEmojis(text) : text;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const combinedRegex = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)/g;

  while ((match = combinedRegex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={lastIndex}>{cleaned.slice(lastIndex, match.index)}</span>);
    }

    if (match[1]) {
      const linkText = match[2]!;
      const url = match[3]!;
      const isLocalhost = url.includes("localhost") || url.includes("127.0.0.1");

      if (isLocalhost) {
        parts.push(
          <span key={match.index} className="font-medium text-foreground underline decoration-primary/50">
            {linkText}
          </span>
        );
      } else {
        parts.push(
          <a
            key={match.index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline hover:opacity-80"
          >
            {linkText}
          </a>
        );
      }
    } else if (match[4]) {
      parts.push(
        <strong key={match.index} className="font-semibold text-foreground">
          {match[5]}
        </strong>
      );
    }

    lastIndex = combinedRegex.lastIndex;
  }

  if (lastIndex < cleaned.length) {
    parts.push(<span key={lastIndex}>{cleaned.slice(lastIndex)}</span>);
  }

  return parts;
}

