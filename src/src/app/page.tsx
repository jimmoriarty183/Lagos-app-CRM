import { LandingPage } from "../components/LandingPage";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* BACKGROUND like Figma Make */}
      <div className="pointer-events-none absolute inset-0">
        {/* blue blob */}
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-blue-300/40 blur-[120px]" />

        {/* green blob */}
        <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-emerald-300/40 blur-[140px]" />

        {/* white soft overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/80 to-white" />
      </div>

      {/* CONTENT */}
      <div className="relative z-10">
        <LandingPage />
      </div>
    </div>
  );
}
