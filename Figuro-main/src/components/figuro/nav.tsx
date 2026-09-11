import { Link, useNavigate } from "@tanstack/react-router";
import { BookMarked, BookOpen, Home, Library, LineChart, PencilRuler, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useFiguroSession } from "@/lib/figuro-session";

const ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/lessons", label: "Lessons", icon: Library },
  { to: "/learn", label: "Learn", icon: BookOpen },
  { to: "/practice", label: "Practice", icon: PencilRuler },
  { to: "/flashcards", label: "Flashcards", icon: BookMarked },
  { to: "/solve", label: "Solve", icon: Sparkles },
  { to: "/progress", label: "Progress", icon: LineChart },
] as const;

/** Sign-in state in the header, so a signed-in learner always has a way out. */
function AccountControl() {
  const { userId, email, signOut } = useFiguroSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!userId) {
    return (
      <Link
        to="/auth"
        className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground ring-1 ring-primary"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[16ch] truncate text-xs text-muted-foreground lg:inline">
        {email}
      </span>
      <button
        type="button"
        onClick={async () => {
          await queryClient.cancelQueries();
          queryClient.clear();
          await signOut();
          void navigate({ to: "/auth", replace: true });
        }}
        className="rounded-lg bg-card px-3 py-2 text-sm font-medium ring-1 ring-border transition-colors hover:bg-surface"
      >
        Sign out
      </button>
    </div>
  );
}



export function TopBar() {
  return (
    <header className="sticky top-0 z-40 hidden border-b border-border bg-background/80 backdrop-blur-md md:block">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            F
          </span>
          <span className="text-base font-medium tracking-tight">Figuro</span>
        </Link>
        <nav className="flex items-center gap-1">
          {ITEMS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "bg-surface text-foreground" }}
            >
              {label}
            </Link>
          ))}
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          <AccountControl />
        </nav>
      </div>
    </header>
  );
}

export function MobileTabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/85 px-4 pt-3 pb-6 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex flex-col items-center gap-1 px-1 text-muted-foreground opacity-60 transition-opacity"
            activeProps={{ className: "text-primary opacity-100" }}
          >
            <Icon className="size-5" strokeWidth={1.75} />
            <span className="text-[9px] font-medium tracking-wide uppercase">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
