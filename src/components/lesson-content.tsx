import { AlertCircle, CheckCircle2, Info, Lightbulb, TriangleAlert } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

type CalloutTone = "info" | "success" | "warning" | "important" | "example";

const calloutStyles: Record<CalloutTone, { icon: typeof Info; className: string; label: string }> =
  {
    info: {
      icon: Info,
      label: "Info",
      className: "border-sky-500/30 bg-sky-500/10 text-sky-950 dark:text-sky-100",
    },
    success: {
      icon: CheckCircle2,
      label: "Success",
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100",
    },
    warning: {
      icon: TriangleAlert,
      label: "Warning",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100",
    },
    important: {
      icon: AlertCircle,
      label: "Important",
      className: "border-gold/35 bg-gold/10 text-foreground",
    },
    example: {
      icon: Lightbulb,
      label: "Example",
      className: "border-violet-500/30 bg-violet-500/10 text-violet-950 dark:text-violet-100",
    },
  };

export function InfoCallout(props: Omit<LessonCalloutProps, "tone">) {
  return <LessonCallout tone="info" {...props} />;
}

export function SuccessCallout(props: Omit<LessonCalloutProps, "tone">) {
  return <LessonCallout tone="success" {...props} />;
}

export function WarningCallout(props: Omit<LessonCalloutProps, "tone">) {
  return <LessonCallout tone="warning" {...props} />;
}

export function ImportantCallout(props: Omit<LessonCalloutProps, "tone">) {
  return <LessonCallout tone="important" {...props} />;
}

export function ExampleCallout(props: Omit<LessonCalloutProps, "tone">) {
  return <LessonCallout tone="example" {...props} />;
}

type LessonCalloutProps = { tone: CalloutTone; children: ReactNode; title?: string };

export function LessonCallout({ tone, children, title }: LessonCalloutProps) {
  const style = calloutStyles[tone];
  const Icon = style.icon;
  return (
    <aside
      className={`my-6 rounded-2xl border p-4 sm:p-5 ${style.className}`}
      aria-label={title ?? style.label}
    >
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold">{title ?? style.label}</p>
          <div className="mt-1.5 text-sm leading-6 opacity-90">{children}</div>
        </div>
      </div>
    </aside>
  );
}

export function LessonArticle({ content }: { content: string | null }) {
  if (!content?.trim()) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-border bg-secondary/30 p-6 text-sm leading-6 text-muted-foreground">
        Lesson notes and written guidance will be added here as this lesson is expanded.
      </div>
    );
  }

  return <article className="lesson-article mt-6 max-w-3xl">{renderBlocks(content)}</article>;
}

function renderBlocks(content: string) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push(
        <pre
          key={`code-${index}`}
          className="my-6 overflow-x-auto rounded-2xl border border-border bg-secondary/70 p-4 text-sm leading-6 text-foreground"
        >
          <code data-language={language || undefined}>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const headingClass =
        level === 1 ? "text-3xl sm:text-4xl" : level === 2 ? "mt-10 text-2xl" : "mt-8 text-xl";
      const Tag = `h${level}` as "h1" | "h2" | "h3";
      blocks.push(
        <Tag
          key={`heading-${index}`}
          className={`font-display font-bold tracking-tight ${headingClass}`}
        >
          {renderInline(heading[2])}
        </Tag>,
      );
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index]))
        quoteLines.push(lines[index++].replace(/^>\s?/, ""));
      const callout = /^\[!(INFO|SUCCESS|WARNING|IMPORTANT|EXAMPLE)\]\s*(.*)$/i.exec(quoteLines[0]);
      if (callout) {
        const tone = callout[1].toLowerCase() as CalloutTone;
        const body = [callout[2], ...quoteLines.slice(1)].filter(Boolean).join(" ");
        blocks.push(
          <LessonCallout key={`callout-${index}`} tone={tone}>
            {renderInline(body)}
          </LessonCallout>,
        );
      } else {
        blocks.push(
          <blockquote
            key={`quote-${index}`}
            className="my-6 border-l-2 border-gold pl-5 text-lg italic leading-8 text-muted-foreground"
          >
            {quoteLines.map((quote, quoteIndex) => (
              <p key={quoteIndex}>{renderInline(quote)}</p>
            ))}
          </blockquote>,
        );
      }
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index]))
        items.push(lines[index++].replace(/^[-*]\s+/, ""));
      blocks.push(
        <ul
          key={`ul-${index}`}
          className="my-5 list-disc space-y-2 pl-6 leading-7 marker:text-gold"
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index]))
        items.push(lines[index++].replace(/^\d+\.\s+/, ""));
      blocks.push(
        <ol
          key={`ol-${index}`}
          className="my-5 list-decimal space-y-2 pl-6 leading-7 marker:font-semibold marker:text-gold"
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index]))
      paragraph.push(lines[index++]);
    blocks.push(
      <p
        key={`paragraph-${index}`}
        className="my-5 text-[1.02rem] leading-8 text-muted-foreground sm:text-lg"
      >
        {renderInline(paragraph.join(" "))}
      </p>,
    );
  }

  return blocks;
}

function isBlockStart(line: string) {
  return line.startsWith("```") || /^(#{1,3})\s+|^>\s?|^[-*]\s+|^\d+\.\s+/.test(line);
}

function renderInline(text: string) {
  const pattern = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|_([^_]+)_|`([^`]+)`)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[2] && isSafeUrl(match[3])) {
      parts.push(
        <a
          key={match.index}
          href={match[3]}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-gold underline decoration-gold/50 underline-offset-4 hover:text-gold/80"
        >
          {match[2]}
        </a>,
      );
    } else if (match[4]) {
      parts.push(
        <strong key={match.index} className="font-semibold text-foreground">
          {match[4]}
        </strong>,
      );
    } else if (match[5]) {
      parts.push(<em key={match.index}>{match[5]}</em>);
    } else if (match[6]) {
      parts.push(
        <code
          key={match.index}
          className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.9em] text-foreground"
        >
          {match[6]}
        </code>,
      );
    } else {
      parts.push(match[0]);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function isSafeUrl(value: string | undefined) {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function LessonResources() {
  return (
    <section
      className="mt-12 border-t border-border pt-8"
      aria-labelledby="lesson-resources-heading"
    >
      <h2 id="lesson-resources-heading" className="font-display text-xl font-semibold">
        Lesson Resources
      </h2>
      <div className="mt-4 rounded-2xl border border-dashed border-border bg-secondary/25 p-5 text-sm text-muted-foreground">
        No downloadable resources for this lesson.
      </div>
    </section>
  );
}

export function LessonNotes({ lessonId }: { lessonId: string }) {
  const storageKey = `blackpips:lesson-notes:${lessonId}`;
  const [notes, setNotes] = useState("");
  const [loadedLessonId, setLoadedLessonId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setNotes(window.localStorage.getItem(storageKey) ?? "");
    } catch {
      setNotes("");
    }
    setLoadedLessonId(lessonId);
  }, [lessonId, storageKey]);

  useEffect(() => {
    if (loadedLessonId !== lessonId) return;
    try {
      window.localStorage.setItem(storageKey, notes);
    } catch {
      // Local notes are optional and should never prevent learning.
    }
  }, [lessonId, loadedLessonId, notes, storageKey]);

  return (
    <section className="mt-10 border-t border-border pt-8" aria-labelledby="lesson-notes-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="lesson-notes-heading" className="font-display text-xl font-semibold">
          My Notes
        </h2>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          Saved locally in this browser
        </span>
      </div>
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Write down key ideas, trade setups, and questions…"
        className="mt-4 min-h-44 w-full resize-y rounded-2xl border border-border bg-secondary/30 p-4 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-gold/60 focus:ring-2 focus:ring-gold/20"
        aria-label="Personal lesson notes"
      />
    </section>
  );
}

export function ReadingProgressBar({ value }: { value: number }) {
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1 bg-transparent" aria-hidden="true">
      <div
        className="h-full bg-gradient-gold transition-[width] duration-100"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
