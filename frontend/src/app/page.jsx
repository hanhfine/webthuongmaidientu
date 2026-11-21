import ScrollShrinkHero from '@/components/home/ScrollShrinkHero';
import FeatureStory from '@/components/home/FeatureStory';
import RecommendedGrid from '@/components/home/RecommendedGrid';

export default function HomePage() {
  return (
    <main className="flex-1 overflow-x-hidden">
      {/* 1. Full-screen Hero Banner with Scroll-driven Shrink */}
      <ScrollShrinkHero />

      {/* 2. Big Feature Story Highlight Banners with Scroll Reveal */}
      <FeatureStory />

      {/* 3. Recommended & Smart Selection Assistant */}
      <RecommendedGrid />
    </main>
  );
}
