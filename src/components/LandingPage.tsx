import Link from "next/link";
import TopBar from "./TopBar";
import { ArrowRight, Clock, Smartphone, ListChecks } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50/30 to-white">
      {/* Header */}
      <TopBar
        businessName="ordero-demo-store-with-a-very-long-name"
        role="Owner"
        switcherHint="Tap to switch"
      />

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left: Hero Content */}
          <div className="space-y-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              Built for small businesses
            </div>

            {/* Headline */}
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-6xl tracking-tight text-gray-900 leading-[1.1]">
                Manage orders in one place.
                <br />
                <span className="text-gray-600">Keep customers updated.</span>
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed max-w-xl">
                Ordero helps stores track orders, due dates and payments — on
                mobile and desktop. Simple UI. No training.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <Link
                href="/welcome"
                className="group px-6 py-3.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                Open my orders
                <ArrowRight
                  size={16}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </Link>
              <Link
                href="/pricing"
                className="px-6 py-3.5 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors border border-gray-200"
              >
                See pricing
              </Link>
            </div>

            {/* Feature Cards */}
            <div className="grid sm:grid-cols-3 gap-4 pt-6">
              <FeatureCard
                icon={<Clock size={20} />}
                title="Fast setup"
                description="Start in minutes"
              />
              <FeatureCard
                icon={<Smartphone size={20} />}
                title="Mobile-first"
                description="Works great on phones"
              />
              <FeatureCard
                icon={<ListChecks size={20} />}
                title="Simple statuses"
                description="Track every order"
              />
            </div>

            {/* Redirect notice */}
            <p className="text-xs text-gray-400 pt-4">
              If you were redirected here, you're not signed in yet.
            </p>
          </div>

          {/* Right: Preview Panel */}
          <div className="lg:pt-8">
            <PreviewPanel />
          </div>
        </div>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group p-5 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
      <div className="flex flex-col gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-700 group-hover:bg-gray-100 transition-colors">
          {icon}
        </div>
        <div>
          <div className="font-semibold text-gray-900 text-sm mb-1">
            {title}
          </div>
          <div className="text-xs text-gray-500">{description}</div>
        </div>
      </div>
    </div>
  );
}

function PreviewPanel() {
  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <div className="w-1 h-1 bg-gray-400 rounded-full" />
        What customers see
      </div>

      {/* Preview Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-500">
                Order #123
              </div>
            </div>
            <div className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-md border border-amber-100">
              IN_PROGRESS
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Due date */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Due date
            </div>
            <div className="text-2xl font-semibold text-gray-900">Tomorrow</div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Payment */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Payment
            </div>
            <div className="text-lg font-semibold text-gray-900">
              WAITING_PAYMENT
            </div>
          </div>

          {/* CTA Button */}
          <button className="w-full px-6 py-4 bg-gray-900 !text-white rounded-xl font-medium hover:bg-gray-800 transition-all shadow-sm hover:shadow-md">
            Contact store
          </button>

          {/* Footer note */}
          <div className="pt-2 text-xs text-gray-400 text-center">
            Redirect target: /b/demo
          </div>
        </div>
      </div>

      {/* Additional info */}
      <p className="text-xs text-gray-500 leading-relaxed">
        Clean order page with status, due date and payment mark.
      </p>
    </div>
  );
}
