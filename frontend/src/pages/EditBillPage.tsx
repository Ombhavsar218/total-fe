import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { billService } from "@/services/bill.service";
import { getErrorMessage } from "@/lib/utils";
import type { Bill } from "@/types";
import { BillForm } from "@/components/bills/BillForm";
import { Card } from "@/components/ui/card";
import { ErrorState, PageLoader } from "@/components/ui/feedback";

export function EditBillPage() {
  const { id } = useParams();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    billService
      .get(id)
      .then(setBill)
      .catch((err) => setError(getErrorMessage(err, "Unable to load this bill.")))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader label="Loading bill…" />;
  if (error || !bill) {
    return (
      <Card>
        <ErrorState message={error || "Bill not found."} />
      </Card>
    );
  }
  return <BillForm mode="edit" bill={bill} />;
}
