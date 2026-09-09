import type { Metadata } from 'next';
import Link from 'next/link';
import { projects } from '@/lib/portfolio-data';
import { NotFoundScene } from '@/components/not-found-scene';

export const metadata: Metadata = {
  title: { absolute: '404 — Kamalakar Reddy Gorantla' },
  description: 'That page is not part of the system.',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="notfound-view">
      <div className="notfound-scene" aria-hidden="true">
        <NotFoundScene />
      </div>
      <div className="notfound-header">
        <Link href="/" className="brand-stamp" aria-label="Kamalakar Reddy Gorantla home">
          <span>K/R</span>
          <small>HUMAN<br />IN THE LOOP</small>
        </Link>
      </div>
      <span className="eyebrow">ERROR 404 / PAGE NOT FOUND</span>
      <h1>404<span aria-hidden="true">✳</span></h1>
      <p>
        This page is not part of the system. The link may be incomplete, or the page may have been
        renamed since it was shared.
      </p>
      <nav className="notfound-links" aria-label="Return to the site">
        <Link href="/" className="text-link">Back to work<span aria-hidden="true">↗</span></Link>
        <Link href="/about" className="text-link">About<span aria-hidden="true">↗</span></Link>
        <Link href="/playground" className="text-link">Playground<span aria-hidden="true">↗</span></Link>
      </nav>
      <div className="notfound-projects">
        <span className="eyebrow">OR GO STRAIGHT TO A PROJECT</span>
        <ul>
          {projects.map(p => (
            <li key={p.slug}>
              <Link href={`/project/${p.slug}`}>
                <span>{p.name}</span>
                <small>{p.category}</small>
                <em aria-hidden="true">↗</em>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
