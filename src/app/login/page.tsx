import LoginClient from "./LoginClient";
import TopBar from "@/components/TopBar";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function LoginPage({ searchParams }: PageProps) {
  const nextParam = searchParams?.next;
  const next =
    typeof nextParam === "string"
      ? nextParam
      : Array.isArray(nextParam)
      ? nextParam[0]
      : "";

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at 20% 10%, rgba(59,130,246,0.12), transparent 60%), radial-gradient(900px 500px at 80% 20%, rgba(16,185,129,0.12), transparent 55%), #f8fafc",
      }}
    >
      <TopBar subtitle="Log in" rightVariant="login" />

      {/* контент логина */}
      <div style={{ padding: 18 }}>
        <LoginClient next={next} />
      </div>
    </main>
  );
}
