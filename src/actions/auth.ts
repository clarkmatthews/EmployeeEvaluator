"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";

export async function login(_prev: { error: string }, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user || user.status === "INACTIVE") {
    return { error: "Those credentials were not recognized." };
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { error: "Those credentials were not recognized." };
  await setSessionCookie(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await clearSessionCookie();
  redirect("/login");
}
