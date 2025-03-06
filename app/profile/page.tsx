import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db as prisma } from "@/lib/db";
import ProfileForm from "@/components/ProfileForm";
import { PageHeader } from "@/components/ui/page-header";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader 
        title="Profile Settings"
        breadcrumbs={[{ label: "Profile" }]}
      >
        <p className="text-sm text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </PageHeader>
      <div className="flex-1 container py-8">
        <ProfileForm user={user} />
      </div>
    </div>
  );
} 