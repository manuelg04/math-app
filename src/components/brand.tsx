import Link from "next/link";
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand ${light ? "brand-light" : ""}`}
      aria-label="RQ+, inicio"
    >
      RQ<span>+</span>
      <small>
        RAZONAMIENTO
        <br />
        CUANTITATIVO
      </small>
    </Link>
  );
}
