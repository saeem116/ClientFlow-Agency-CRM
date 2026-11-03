import { LandingNav } from "./landing-nav"
import { LandingHero } from "./landing-hero"
import { ProductPreview } from "./product-preview"
import { BenefitsSection } from "./benefits-section"
import { FeaturesSection } from "./features-section"
import { HowItWorks } from "./how-it-works"
import { WhoItFor } from "./who-it-for"
import { SecuritySection } from "./security-section"
import { FAQSection } from "./faq-section"
import { FinalCTA } from "./final-cta"
import { LandingFooter } from "./landing-footer"

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <LandingNav />
      <main>
        <LandingHero />
        <ProductPreview />
        <BenefitsSection />
        <FeaturesSection />
        <HowItWorks />
        <WhoItFor />
        <SecuritySection />
        <FAQSection />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  )
}