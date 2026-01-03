import "./globals.css"; // Achte darauf, dass der Punkt davor ist!
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={`${inter.className} bg-black text-white`}>
        {children}
      </body>
    </html>
  );
}