import { syncUser, getCoaches, getUserTier } from "@/lib/actions";
import DashboardClient from "./DashboardClient";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function DashboardPage() {
    const { userId } = await auth();
    
    if (!userId) {
        redirect("/");
    }

    // Sync user and fetch initial data on the server
    const [syncedUser, coaches, tier] = await Promise.all([
        syncUser(),
        getCoaches(),
        getUserTier()
    ]);

    return (
        <DashboardClient 
            initialCoaches={coaches} 
            initialTier={tier} 
        />
    );
}
