import HeroIllustration from "@/components/ui/HeroIllustration";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream p-6">
      <div className="w-full max-w-sm text-center">
        <HeroIllustration />
        <h1 className="text-4xl text-canyon">Recipe book</h1>
        <p className="mt-2 text-ink/70">
          Welcome back — let’s see what’s cooking.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
