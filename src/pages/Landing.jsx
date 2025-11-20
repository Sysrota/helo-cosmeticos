import LandingHero from "../components/landing/LandingHero";
import LandingBenefits from "../components/landing/LandingBenefits";
import LandingHowItWorks from "../components/landing/LandingHowItWorks";
import LandingBeforeAfter from "../components/landing/LandingBeforeAfter";
import LandingTestimonials from "../components/landing/LandingTestimonials";
import LandingCTA from "../components/landing/LandingCTA";

export default function Landing() {
  return (
    <div className="bg-helo-background">
      <LandingHero />
      <LandingBenefits />
      <LandingHowItWorks />
      <LandingBeforeAfter />
      <LandingTestimonials />
      <LandingCTA />
    </div>
  );
}
