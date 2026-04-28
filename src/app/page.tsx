import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { ProductMockup } from "@/components/landing/ProductMockup";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Audiences } from "@/components/landing/Audiences";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main className="relative">
        <Hero />
        <ProductMockup />
        <HowItWorks />
        <Features />
        <Audiences />
      </main>
      <Footer />
    </>
  );
}
