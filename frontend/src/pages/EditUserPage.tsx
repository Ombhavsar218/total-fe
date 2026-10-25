import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { userService } from "@/services/user.service";
import { getErrorMessage } from "@/lib/utils";
import type { AuthUser } from "@/types";
import { UserForm } from "@/components/users/UserForm";
import { Card } from "@/components/ui/card";
import { ErrorState, PageLoader } from "@/components/ui/feedback";

export function EditUserPage() {
  const { id } = useParams();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    userService
      .get(id)
      .then(setUser)
      .catch((err) => setError(getErrorMessage(err, "Unable to load this user.")))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader label="Loading user…" />;
  if (error || !user) {
    return (
      <Card>
        <ErrorState message={error || "User not found."} />
      </Card>
    );
  }
  return <UserForm mode="edit" user={user} />;
}
