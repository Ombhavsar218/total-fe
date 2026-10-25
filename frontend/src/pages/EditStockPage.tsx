import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { stockService } from "@/services/stock.service";
import { getErrorMessage } from "@/lib/utils";
import type { Stock } from "@/types";
import { StockForm } from "@/components/stock/StockForm";
import { Card } from "@/components/ui/card";
import { ErrorState, PageLoader } from "@/components/ui/feedback";

export function EditStockPage() {
  const { id } = useParams();
  const [stock, setStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    stockService
      .get(id)
      .then(setStock)
      .catch((err) => setError(getErrorMessage(err, "Unable to load this stock item.")))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader label="Loading stock item…" />;
  if (error || !stock) {
    return (
      <Card>
        <ErrorState message={error || "Stock item not found."} />
      </Card>
    );
  }
  return <StockForm mode="edit" stock={stock} />;
}
