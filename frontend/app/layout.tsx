// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import 'bootstrap/dist/css/bootstrap.min.css';
import { AuthProvider } from "../context/AuthContext";
import NavBar from "../components/Navbar";

export const metadata: Metadata = {
  title: "CareerConnect - Find Jobs",
  description: "CareerConnect platform for job seekers and employers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Add Bootstrap Icons CDN */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css"
        />
      </head>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <AuthProvider>
          <NavBar />
          <main>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}