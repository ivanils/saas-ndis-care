import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.scss"; // Cambiaremos la extensión a .scss en el siguiente paso

// Configuramos la fuente
const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'], // Los pesos que usaremos
  variable: '--font-jakarta', // La exportamos como variable CSS
});

export const metadata: Metadata = {
  title: "Bellvi | Modern Healthcare Management",
  description: "Caregiver SaaS application prioritizing people.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={jakarta.className}>
        {children}
      </body>
    </html>
  );
}