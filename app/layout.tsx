import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ORBIT — личные финансы",
  description: "Ваши финансы на одной орбите. Учитывайте доходы и расходы и замечайте главное.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="antialiased">{children}{process.env.NODE_ENV === "development" && <script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async/>}</body>
    </html>
  );
}

