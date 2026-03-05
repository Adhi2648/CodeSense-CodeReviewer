import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Landing } from "@/pages/Landing";
import { Review } from "@/pages/Review";
import { Dashboard } from "@/pages/Dashboard";
import { History } from "@/pages/History";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const Nav = (): JSX.Element => {
  const { isAuthenticated, logout, user } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <Link to="/" className="text-xl font-black">
          CodeSense
        </Link>
        <nav className="flex items-center gap-2">
          {[
            { to: "/review", label: "Review" },
            { to: "/dashboard", label: "Dashboard" },
            { to: "/history", label: "History" }
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`rounded-md px-3 py-2 text-sm transition ${
                location.pathname === item.to ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {!isAuthenticated ? (
            <Button size="sm" onClick={() => (window.location.href = "/api/auth/github")}>
              Login with GitHub
            </Button>
          ) : (
            <div className="ml-2 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{user?.username}</span>
              <Button size="sm" variant="outline" onClick={() => void logout()}>
                Logout
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

const AuthGate = ({ children }: { children: JSX.Element }): JSX.Element => {
  const { isLoading, isAuthenticated } = useAuth();
  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading auth state...</div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const App = (): JSX.Element => (
  <div className="min-h-screen">
    <Nav />
    <main>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/review"
          element={
            <AuthGate>
              <Review />
            </AuthGate>
          }
        />
        <Route
          path="/dashboard"
          element={
            <AuthGate>
              <Dashboard />
            </AuthGate>
          }
        />
        <Route
          path="/history"
          element={
            <AuthGate>
              <History />
            </AuthGate>
          }
        />
      </Routes>
    </main>
  </div>
);

export default App;
