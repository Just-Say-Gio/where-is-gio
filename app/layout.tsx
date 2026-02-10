import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Where Is Gio?",
  description:
    "A live travel calendar showing where Gio is around the world in 2026",
  openGraph: {
    title: "Where Is Gio?",
    description: "See Gio's travel plans across 15+ countries in 2026",
    type: "website",
    url: "https://whereisgio.live",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var t = localStorage.getItem('theme');
                if (t !== 'light') {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <AnalyticsBeacon />
        {children}
      </body>
    </html>
  );
}
