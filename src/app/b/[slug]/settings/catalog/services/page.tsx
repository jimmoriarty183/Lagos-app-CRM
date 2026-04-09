import { redirect } from "next/navigation";

export default async function CatalogServicesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/b/${slug}/catalog/services`);
}
