import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import type { Role, SessionUser } from "@/lib/scoring";

const COOKIE = "ee_session";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32 || value === "replace-with-a-long-random-string") {
    throw new Error("AUTH_SECRET must be at least 32 characters and must not be the example placeholder");
  }
  return new TextEncoder().encode(value);
}

export async function createSessionToken(userId: string, sessionVersion: number) {
  return new SignJWT({ userId, sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function setSessionCookie(userId: string, sessionVersion: number) {
  const token = await createSessionToken(userId, sessionVersion);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const userId = String(payload.userId ?? "");
    const sessionVersion = payload.sessionVersion;
    if (!userId || typeof sessionVersion !== "number" || !Number.isInteger(sessionVersion)) return null;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status === "INACTIVE" || user.sessionVersion !== sessionVersion) return null;
    return {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRoles(roles: Role[]) {
  const session = await requireUser();
  if (!roles.includes(session.role)) {
    redirect("/dashboard?error=" + encodeURIComponent("You do not have access to that page."));
  }
  return session;
}

export async function requireAdmin() {
  return requireRoles(["ADMIN"]);
}
