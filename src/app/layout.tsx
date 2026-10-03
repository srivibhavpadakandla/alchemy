import type { Metadata } from "next";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/press-start-2p/400.css";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";
import "./redesign.css";
import "./optiflux.css";
import "./alchemy.css";
import "./cosmos.css";
import "./video-inspired.css";
export const metadata: Metadata = {
  title: "Alchemy · Customer trials that prove value.",
  description:
    "Agree on the trial. Track the work. Prove the value. Make a clear commercial decision.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
