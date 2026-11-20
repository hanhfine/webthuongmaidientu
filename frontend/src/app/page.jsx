import ScrollShrinkHero from '@/components/home/ScrollShrinkHero';
import TabbedShowcase from '@/components/home/TabbedShowcase';
import FeatureStory from '@/components/home/FeatureStory';
import RecommendedGrid from '@/components/home/RecommendedGrid';

export default function HomePage() {
  return (
    <main className="flex-1 overflow-x-hidden">
      {/* 1. Hero Banner Shrinks on Scroll */}
      <ScrollShrinkHero />

      {/* 2. Interactive Zero-reload Tabbed Showcase ("Lựa chọn tối ưu chuẩn sống của bạn") */}
      <TabbedShowcase />

      {/* 3. Big Feature Story Highlight Banners with Scroll Reveal */}
      <FeatureStory />

      {/* 4. Recommended & Smart Selection Assistant */}
      <RecommendedGrid />
    </main>
  );
}
