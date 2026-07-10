import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Locusify API",
  description: "Locusify Backend API Service",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
