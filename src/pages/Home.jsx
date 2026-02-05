import Hero from "../components/Hero";
import Pricing from "../components/Pricing";
import AuthModal from "./Login";

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Közös Background */}
      <div className="absolute inset-0 z-0">
        {/* Itt lehetnek az animált gömbök, gradient blur, stb */}
      </div>

      <Hero />

      <Pricing />
    </div>
  );
}
