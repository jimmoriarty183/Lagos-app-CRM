import ResetPasswordUI from "./ui";

export default function Page() {
  return (
    <div className="min-h-[100svh] bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50">
      <div className="mx-auto flex min-h-[100svh] max-w-md items-center px-4 py-6">
        <ResetPasswordUI />
      </div>
    </div>
  );
}
