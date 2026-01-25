type Props = {
  open: boolean;
  orderId: string | null;
  onClose: () => void;
};

export function OrderPreview({ open, orderId, onClose }: Props) {
  if (!open || !orderId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Order #{orderId}</h3>
          <button onClick={onClose}>✕</button>
        </div>

        {/* здесь позже детали заказа */}
        <div className="text-sm text-gray-600">Order details preview</div>
      </div>
    </div>
  );
}
