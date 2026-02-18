import { syncUser, getCoach, getMessages } from "@/lib/actions";
import CoachClient from "./CoachClient";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function CoachPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { userId } = await auth();
    
    if (!userId) {
        redirect("/");
    }

    // Fetch initial data on the server
    const [syncedUser, coach, messages] = await Promise.all([
        syncUser(),
        getCoach(id),
        getMessages(id)
    ]);

    if (!coach) {
        redirect("/dashboard");
    }

    return (
        <CoachClient 
            coach={coach} 
            initialMessages={messages} 
        />
    );
}