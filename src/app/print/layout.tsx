import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return <div className="mx-auto max-w-[8.5in] bg-white px-6 py-8 print:max-w-none print:px-0">{children}</div>;
}
