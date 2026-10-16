import type { Metadata } from "next";
import "@fontsource-variable/inter-tight/wght.css";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "NCL — National Cyber League", template: "%s | NCL" },
  description:
    "National Cyber League — O‘zbekiston universitetlari uchun Counter-Strike 2 sahnasi. University esports in Uzbekistan.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz">
      <body>
        <a className="skip-link" href="#content">
          Kontentga o‘tish / Skip to content
        </a>
        <div id="content">{children}</div>
      </body>
    </html>
  );
}
