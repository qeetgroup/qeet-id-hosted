// Dates as the pages say them, in the language's own way. English is written as in India, where
// Qeet is (12 Sept 2026, 9:14 am), as the mockups do.

const LOCALES: Record<string, string> = { en: "en-IN" };

function locale(language: string): string {
  return LOCALES[language] ?? language;
}

/** A day: "12 Sept 2026", or "1 Dec" without the year. */
export function formatDay(iso: string, language: string, withYear = true): string {
  return new Intl.DateTimeFormat(locale(language), {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(new Date(iso));
}

/** When something happened: "Today, 9:14 am", "Yesterday", or the day. */
export function formatWhen(
  iso: string,
  language: string,
  words: { today: string; yesterday: string },
  now = new Date(),
): string {
  const when = new Date(iso);
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(now) - day(when)) / 86_400_000);
  if (days === 0) {
    const time = new Intl.DateTimeFormat(locale(language), { hour: "numeric", minute: "2-digit" })
      .format(when)
      .toLowerCase();
    return `${words.today}, ${time}`;
  }
  if (days === 1) return words.yesterday;
  return formatDay(iso, language);
}

/** A wait as a clock: "0:42". */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
