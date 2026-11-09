import "@/app/globals.css";
import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import SmoothScroll from "@/components/SmoothScroll";
import AutoplayInit from "@/components/AutoplayInit";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#e796e7",
};

export const metadata: Metadata = {
  title: "Terrified",
  description: "Passionate developer creating products for everyone.",
  icons: { icon: "https://avatars.githubusercontent.com/endclosure" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${poppins.variable} min-h-screen antialiased bg-[#0a0909] text-white`}>
        <SmoothScroll />
        <AutoplayInit />
        {children}
      </body>
    </html>
  );
}
