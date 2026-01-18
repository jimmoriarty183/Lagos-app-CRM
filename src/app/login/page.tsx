import LoginClient from "./LoginClient";

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

  return <LoginClient next={next} />;
}
