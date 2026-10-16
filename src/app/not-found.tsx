import Link from "next/link";
export default function NotFound() {
  return (
    <main className="container inner-page">
      <p className="eyebrow">NCL / 404</p>
      <h1 className="page-title">Sahifa topilmadi.</h1>
      <p>Страница не найдена. / Page not found.</p>
      <Link className="button primary" href="/">
        Bosh sahifa / Home ↗
      </Link>
    </main>
  );
}
