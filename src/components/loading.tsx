export function Loading({
  label = "Preparando tu espacio…",
}: {
  label?: string;
}) {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      <p>{label}</p>
    </div>
  );
}
