import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { purchaseService } from "@/services/purchase.service";
import { getErrorMessage } from "@/lib/utils";
import type { Purchase } from "@/types";
import { PurchaseForm } from "@/components/purchases/PurchaseForm";
import { Card } from "@/components/ui/card";
import { ErrorState, PageLoader } from "@/components/ui/feedback";

export function EditPurchasePage() {
  const { id } = useParams();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    purchaseService
      .get(id)
      .then(setPurchase)
      .catch((err) => setError(getErrorMessage(err, "Unable to load this purchase order.")))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader label="Loading purchase order…" />;
  if (error || !purchase) {
    return (
      <Card>
        <ErrorState message={error || "Purchase order not found."} />
      </Card>
    );
  }
  return <PurchaseForm mode="edit" purchase={purchase} />;
}
