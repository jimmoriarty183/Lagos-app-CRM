import WelcomeClient from "./WelcomeClient";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function WelcomePage({ searchParams }: PageProps) {
  const uParam = searchParams?.u;
  const u =
    typeof uParam === "string"
      ? uParam
      : Array.isArray(uParam)
      ? uParam[0]
      : "";

  return <WelcomeClient u={u} />;
}
