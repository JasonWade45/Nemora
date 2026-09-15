import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { About } from "@/components/landing/About";
import { Solutions } from "@/components/landing/Solutions";
import { AISection } from "@/components/landing/AISection";
import { Security } from "@/components/landing/Security";
import { FinalCTA, Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <main id="top" className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <About />
      <Solutions />
      <AISection />
      <Security />
      <FinalCTA />
      <Footer />
    </main>
  );
}
