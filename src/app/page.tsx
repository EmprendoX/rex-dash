import { redirect } from "next/navigation";

// Middleware handles auth-based routing. Anything that hits `/` goes to /app;
// unauthenticated users get bounced to /login by the middleware.
export default function Home() {
  redirect("/app");
}
