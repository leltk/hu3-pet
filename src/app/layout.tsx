import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hu3 Pet",
  description: "Seu pet quer virar Challenger."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}