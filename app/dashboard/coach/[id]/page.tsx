import { syncUser, getCoach, getMessages } from "@/lib/actions";
import CoachClient from "./CoachClient";
import { redirect } from "next/navigation";
;

export default async function CoachPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    // Fetch initial data on the server
    const profile = await syncUser();
    
    if (!profile) {
        redirect("/login");
    }

    const [coach, messages] = await Promise.all([
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
            userProfile={profile}
        />
    );
}
