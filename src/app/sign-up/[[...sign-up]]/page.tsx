import { SignUp } from "@clerk/nextjs"
import { pageMetadata } from "@/lib/site"

export const metadata = pageMetadata(
    "Create an account",
    "Create a free account to research any listed company and stress-test your portfolio."
)

export default function SignUpPage() {
    return (
        <div className="container mx-auto px-4 min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-16 relative z-10">
            <div className="mb-8 text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter">Create your account</h1>
                <p className="text-sm text-muted-foreground">
                    Free to start. No card required.
                </p>
            </div>
            <SignUp signInUrl="/sign-in" fallbackRedirectUrl="/dashboard" />
        </div>
    )
}
