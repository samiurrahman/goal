import dynamic from "next/dynamic";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/utils/reactQueryClient";
import { Poppins } from "next/font/google";
import SiteHeader from "./(client-components)/(Header)/SiteHeader";
import ClientCommons from "./ClientCommons";
import "./globals.css";
import "@/fonts/line-awesome-1.3.0/css/line-awesome.css";
import "@/styles/index.scss";
import "rc-slider/assets/index.css";
import Footer from "@/components/Footer";
import FooterNav from "@/components/FooterNav";
import { ReactQueryProvider } from "./providers";
import { Metadata } from "next";
import StructuredData from "@/components/StructuredData";

const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://hajjscanner.com"
  ),
  title: {
    default: "Hajj & Umrah Packages | Best Islamic Travel Deals",
    template: "%s | Hajjscanner",
  },
  description:
    "Discover affordable Hajj and Umrah packages with Hajjscanner. Compare prices from verified travel agents, book hotels near Haram, and plan your spiritual journey with ease.",
  keywords: [
    "Hajj packages",
    "Umrah packages",
    "Islamic travel",
    "Makkah hotels",
    "Madinah hotels",
    "Hajj booking",
    "Umrah deals",
    "travel agents",
    "pilgrimage packages",
  ],
  authors: [{ name: "Hajjscanner" }],
  creator: "Hajjscanner",
  publisher: "Hajjscanner",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://hajjscanner.com",
    siteName: "Hajjscanner",
    title: "Premium Hajj & Umrah Packages",
    description:
      "Discover affordable Hajj and Umrah packages with Hajjscanner. Compare prices from verified travel agents and plan your spiritual journey.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Hajj & Umrah Packages",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Premium Hajj & Umrah Packages",
    description:
      "Discover affordable Hajj and Umrah packages. Compare prices and book your spiritual journey.",
    images: ["/og-image.jpg"],
    creator: "@hajjscanner",
  },
  verification: {
    google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
    // bing: "your-bing-verification-code"
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: any;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hajjscanner.com";

  return (
    <html lang="en" className={poppins.className}>
      <head>
        <StructuredData
          type="Organization"
          data={{
            name: "Hajjscanner",
            url: baseUrl,
            logo: `${baseUrl}/logo.png`,
            description:
              "Premium Hajj & Umrah travel booking platform connecting pilgrims with verified travel agents",
            telephone: "+1-XXX-XXX-XXXX",
            socialLinks: [
              // Add your social media links here
              // 'https://facebook.com/yourpage',
              // 'https://twitter.com/yourhandle',
            ],
          }}
        />
        <StructuredData
          type="WebSite"
          data={{
            name: "Hajjscanner",
            url: baseUrl,
            description:
              "Book Hajj and Umrah packages online with verified travel agents",
          }}
        />
      </head>
      <body className="bg-white text-base dark:bg-neutral-900 text-neutral-900 dark:text-neutral-200">
        <ClientCommons />
        <SiteHeader />
        <ReactQueryProvider>{children}</ReactQueryProvider>
        {/* <Footer /> */}
      </body>
    </html>
  );
}
