import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { shopService } from "@/services/shop.service";
import { getErrorMessage } from "@/lib/utils";
import type { Shop } from "@/types";
import { ShopForm } from "@/components/shops/ShopForm";
import { Card } from "@/components/ui/card";
import { ErrorState, PageLoader } from "@/components/ui/feedback";

export function EditShopPage() {
  const { id } = useParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    shopService
      .get(id)
      .then(setShop)
      .catch((err) => setError(getErrorMessage(err, "Unable to load this shop.")))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader label="Loading shop…" />;
  if (error || !shop) {
    return (
      <Card>
        <ErrorState message={error || "Shop not found."} />
      </Card>
    );
  }
  return <ShopForm mode="edit" shop={shop} />;
}
