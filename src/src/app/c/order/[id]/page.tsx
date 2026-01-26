// src/app/c/order/[id]/page.tsx
export default async function ClientOrderPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800 }}>Client Order</h1>
      <div style={{ marginTop: 8, opacity: 0.8 }}>Order ID: {params.id}</div>
    </main>
  );
}
