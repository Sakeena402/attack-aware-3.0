// app/pricing/page.tsx
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PricingPage from '@/components/pricing/PricingPage';
import { PlanCategory } from '@/app/data/plans';

export default function Page({ searchParams }: { searchParams: { tab?: string } }) {
  const initialTab: PlanCategory = searchParams.tab === 'enterprise' ? 'enterprise' : 'individual';

  return (
    <div className="bg-background text-foreground overflow-hidden">
      <Navbar />
      <PricingPage initialTab={initialTab} />
      <Footer />
    </div>
  );
}