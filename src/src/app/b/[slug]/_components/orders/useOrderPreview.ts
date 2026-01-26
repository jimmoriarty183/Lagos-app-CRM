import { useState } from "react";

export function useOrderPreview() {
  const [open, setOpen] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const openPreview = (id: string) => {
    setOrderId(id);
    setOpen(true);
  };

  const closePreview = () => {
    setOpen(false);
    setOrderId(null);
  };

  return {
    open,
    orderId,
    openPreview,
    closePreview,
  };
}
