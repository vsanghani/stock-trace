import { SignIn } from "@clerk/nextjs"
import { pageMetadata } from "@/lib/site"

export const metadata = pageMetadata(
    "Sign in",
    "Sign in to access live quotes, fundamentals, sentiment and portfolio risk tools."
)

export default function SignInPage() {
    return (
        <div className="container mx-auto px-4 min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-16 relative z-10">
            <div className="mb-8 text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter">Welcome back</h1>
                <p className="text-sm text-muted-foreground">
                    Sign in to pick up your research where you left off.
                </p>
            </div>
            <SignIn signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" />
        </div>
    )
}
