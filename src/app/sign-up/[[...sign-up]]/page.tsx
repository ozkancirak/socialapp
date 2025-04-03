import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <SignUp
        appearance={{
          elements: {
            formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
            footerActionLink: "text-primary hover:text-primary/90",
          },
        }}
      />
    </div>
  );
} 