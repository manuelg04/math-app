import Link from "next/link";
export default function Page() {
  return (
    <main id="main" className="center-page">
      <h1>Este camino no existe.</h1>
      <Link className="button-link" href="/dashboard">
        Volver a mi espacio
      </Link>
    </main>
  );
}
