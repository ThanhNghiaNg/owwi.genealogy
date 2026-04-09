import { AuthShell } from "@/components/auth/auth-shell";

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center justify-center">
        <AuthShell />
      </div>
    </div>
  );
}
