import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/session";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <p className="text-sm font-medium text-indigo-700">EmployeeEvaluator</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-slate-600">Company administrators, managers, and employees use the same sign-in.</p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <LoginForm />
      </div>
      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Local demo accounts</p>
        <p className="mt-1">Password for each: empEval123!</p>
        <ul className="mt-2 list-disc pl-5">
          <li>admin@empeval.local</li>
          <li>manager@empeval.local</li>
          <li>evan@empeval.local</li>
        </ul>
      </div>
    </main>
  );
}
