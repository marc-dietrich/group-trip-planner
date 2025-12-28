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
    <section className="card muted-card">
      <p className="eyebrow">{eyebrow}</p>
      <h3>{title}</h3>
      <div className="stack sm">
        <div className="pill">Coming soon</div>
        <p className="muted">{description}</p>
      </div>
    </section>
  );
}
