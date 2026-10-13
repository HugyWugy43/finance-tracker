import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "ORBIT — личные финансы",
  description:
    "Ваши финансы на одной орбите. Учитывайте доходы и расходы и замечайте главное.",
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
    <html lang="ru" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
