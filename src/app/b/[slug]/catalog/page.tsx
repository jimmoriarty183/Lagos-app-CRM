import { redirect } from "next/navigation";

export default async function CatalogIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/b/${slug}/catalog/products`);
}
