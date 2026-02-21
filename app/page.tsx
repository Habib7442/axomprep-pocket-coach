import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-white text-black selection:bg-orange-100 selection:text-orange-900 font-sans">
      <Navbar user={user} />
      
      <main className="relative z-10">
        <Hero user={user} />
        
        <Features />
        
        <Pricing />
      </main>

      <Footer />
    </div>
  );
}
