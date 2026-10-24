/** The application being signed in to: a monogram tile and its name. */
export function ClientIdentity({ name }: { name: string }) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "";
  return (
    <div className="flex items-center gap-3.5">
      <span
        aria-hidden
        className="bg-brand-subtle text-brand-display ring-border-brand/30 grid size-12 shrink-0 place-items-center rounded-xl text-lg font-semibold ring-1"
      >
        {initial}
      </span>
      <p className="font-medium">{name}</p>
    </div>
  );
}
