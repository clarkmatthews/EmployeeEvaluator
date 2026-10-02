"use client";

import { useActionState } from "react";
import { login } from "@/actions/auth";
import { buttonClass, inputClass, labelClass } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: "" });
  return (
    <form action={action} className="space-y-4">
      {state.error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{state.error}</p> : null}
      <label className="block">
        <span className={labelClass}>Email</span>
        <input className={inputClass} name="email" type="email" autoComplete="username" required />
      </label>
      <label className="block">
        <span className={labelClass}>Password</span>
        <input className={inputClass} name="password" type="password" autoComplete="current-password" required />
      </label>
      <button className={buttonClass} type="submit" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
