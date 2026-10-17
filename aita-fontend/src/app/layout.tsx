import { AppProviders } from "@/providers/AppProviders";
import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import "@/styles/globals.css";

const jakartaSans = localFont({
  src: "./fonts/PlusJakartaSans-Variable.ttf",
  weight: "300 800",
  display: "swap",
  variable: "--font-sans",
});

const jetbrainsMono = localFont({
  src: "./fonts/JetBrainsMono-Variable.ttf",
  weight: "400 700",
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "AITA - AI Teaching Assistant | Đại Học FPT",
  description: "Hệ thống trợ lý giảng dạy và tự động chấm bài code theo Rubric AI dành cho Đại học FPT",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F26F21'><path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" translate="no" data-ms-editor="false" suppressHydrationWarning className={`light ${jakartaSans.variable} ${jetbrainsMono.variable}`}>
      <head>
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('aita-theme');
                if (stored === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning spellCheck={false} data-ms-editor="false" data-gramm="false" className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-orange-500 selection:text-white dark:selection:bg-orange-600 dark:selection:text-white antialiased transition-colors">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
