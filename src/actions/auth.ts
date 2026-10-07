"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";

const FAILURE_MESSAGE = "Those credentials were not recognized.";
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;
const DUMMY_PASSWORD_HASH = "$2b$10$j.9/xXFKBZRpvJM4GTrsa.NPuG61UgD0OfaHf97fMW2lqiJMrzyX2";

const failures = new Map<string, { count: number; resetAt: number }>();

function tooManyFailures(email: string) {
  const current = failures.get(email);
  if (!current) return false;
  if (current.resetAt <= Date.now()) {
    failures.delete(email);
    return false;
  }
  return current.count >= MAX_FAILURES;
}

function recordFailure(email: string) {
  const now = Date.now();
  const current = failures.get(email);
  if (!current || current.resetAt <= now) {
    failures.set(email, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  current.count += 1;
}

export async function login(_prev: { error: string }, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = await prisma.user.findUnique({
    where: { email },
    omit: { passwordHash: false },
  });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (tooManyFailures(email) || !user || user.status === "INACTIVE" || !ok) {
    recordFailure(email);
    return { error: FAILURE_MESSAGE };
  }
  failures.delete(email);
  await setSessionCookie(user.id, user.sessionVersion);
  redirect("/dashboard");
}

export async function logout() {
  await clearSessionCookie();
  redirect("/login");
}
