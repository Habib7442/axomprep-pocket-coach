import { syncUser, getCoaches, getUserTier } from "@/lib/actions";
import DashboardClient from "./DashboardClient";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const userProfile = await syncUser();
    
    if (!userProfile) {
        redirect("/login");
    }

    if (!userProfile.onboarding_completed) {
        redirect("/onboarding");
    }

    const [coaches, tier] = await Promise.all([
        getCoaches(),
        getUserTier()
    ]);

    return (
        <DashboardClient 
            initialCoaches={coaches} 
            initialTier={tier} 
            userProfile={userProfile}
        />
    );
}
