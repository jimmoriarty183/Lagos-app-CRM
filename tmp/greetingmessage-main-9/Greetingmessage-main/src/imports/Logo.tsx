export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 bg-[#5B5BB3] rounded-lg flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="8" height="8" fill="white" />
          <rect x="16" y="4" width="8" height="8" stroke="white" strokeWidth="2" />
          <rect x="4" y="16" width="8" height="8" stroke="white" strokeWidth="2" />
          <rect x="16" y="16" width="8" height="8" fill="white" />
        </svg>
      </div>
      <span className="text-4xl font-bold text-gray-900">Ordo</span>
    </div>
  );
}