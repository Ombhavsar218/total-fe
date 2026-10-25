import { http } from "@/lib/api";
import type { BusinessProfile, DashboardStats } from "@/types";

export const dashboardService = {
  async stats(month: string) {
    const { data } = await http.get<DashboardStats>("/dashboard/stats/", { params: { month } });
    return data;
  },
};

export const businessService = {
  async get() {
    const { data } = await http.get<{ success: boolean; profile: BusinessProfile }>(
      "/business-profile/",
    );
    return data.profile;
  },
  async update(payload: Partial<BusinessProfile>) {
    const { data } = await http.put<{ success: boolean; profile: BusinessProfile }>(
      "/business-profile/",
      payload,
    );
    return data.profile;
  },
};
