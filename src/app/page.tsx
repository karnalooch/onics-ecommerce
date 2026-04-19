import { HeroSection } from "./_components/HeroSection";
import { FeatureBento } from "./_components/FeatureBento";

export default async function Home() {
  return (
    <main className="flex flex-col">
       <HeroSection />
       <FeatureBento />
    </main>
  );
}
