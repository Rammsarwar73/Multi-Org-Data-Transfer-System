"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDemoSession } from "./demo-session-provider";

type AppShellProps = {
  email: string;
  orgName?: string;
  children: React.ReactNode;
};

export function AppShell({ email, orgName, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useDemoSession();

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/transfer", label: "Transfer" },
    { href: "/inbox", label: "Inbox" },
  ];

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="app-wrap">
      <header className="topbar">
        <div>
          <p className="brand">Secure Data Portal</p>
          <p className="muted-text">
            {orgName ? `${orgName} · ` : ""}Signed in as {email}
          </p>
        </div>

        <nav className="topbar-nav">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link${pathname === link.href ? " nav-link--active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
          <button className="btn btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </nav>
      </header>

      <main className="content-card">{children}</main>
    </div>
  );
}
