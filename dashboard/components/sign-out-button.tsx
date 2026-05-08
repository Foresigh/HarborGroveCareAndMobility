import { signOut } from "@/lib/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: `${process.env.NEXTAUTH_URL ?? ""}/login` });
      }}
    >
      <button
        type="submit"
        className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
      >
        Sign out
      </button>
    </form>
  );
}
