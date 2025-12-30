type ComingSoonCardProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function ComingSoonCard({
  eyebrow,
  title,
  description,
}: ComingSoonCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-card">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-600">
        {eyebrow}
      </p>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <div className="flex flex-col gap-2.5">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
          Coming soon
        </div>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
    </section>
  );
}
