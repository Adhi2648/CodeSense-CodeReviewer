import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const snippets = [
  {
    language: "javascript",
    code: `async function fetchUser(id) {
  const response = await fetch('/api/users/' + id);
  if (!response.ok) throw new Error('Failed');
  return response.json();
}`
  },
  {
    language: "python",
    code: `def process_orders(orders):
    total = 0
    for order in orders:
        if order["status"] == "paid":
            total += order["amount"]
    return total`
  },
  {
    language: "typescript",
    code: `export const calculateRisk = (score: number, factors: number[]) => {
  const weighted = factors.reduce((acc, item) => acc + item, score);
  return weighted > 100 ? "high" : "low";
};`
  }
];

const features = [
  {
    title: "AST Parsing Intelligence",
    description: "Tree-sitter extraction surfaces every function signature, nesting depth, and context."
  },
  {
    title: "Semantic Search over Code",
    description: "pgvector embeddings make natural language code search precise and fast."
  },
  {
    title: "Live Streaming Reviews",
    description: "Server-Sent Events stream findings, refactors, and review summaries in real time."
  }
];

const logos = ["React", "TypeScript", "Node.js", "PostgreSQL", "Redis", "BullMQ", "Prisma"];

export const Landing = (): JSX.Element => {
  const [activeSnippet, setActiveSnippet] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSnippet((prev) => (prev + 1) % snippets.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const currentSnippet = useMemo(() => snippets[activeSnippet], [activeSnippet]);

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-6 py-10 md:px-8">
      <section className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <span className="inline-flex rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-wider">
            CodeSense
          </span>
          <h1 className="text-4xl font-black leading-tight md:text-5xl">
            Code Review Platform Built for High-Bar Engineering Teams
          </h1>
          <p className="max-w-xl text-muted-foreground">
            Analyze complexity, stream actionable findings, and refactor safely with a production-grade review pipeline.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              onClick={() =>
                navigate("/review", {
                  state: {
                    sampleCode: currentSnippet.code,
                    language: currentSnippet.language
                  }
                })
              }
            >
              Try it now
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate("/dashboard")}>
              View dashboard
            </Button>
          </div>
        </div>
        <Card className="animate-fade-up border-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Live Snippet</span>
              <span className="rounded bg-muted px-2 py-1 text-xs uppercase">{currentSnippet.language}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="min-h-[260px] overflow-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-100">
              {currentSnippet.code}
            </pre>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {features.map((feature, index) => (
          <Card key={feature.title} className="animate-fade-up" style={{ animationDelay: `${index * 120}ms` }}>
            <CardHeader>
              <CardTitle>{feature.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{feature.description}</CardContent>
          </Card>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Stack</p>
        <div className="flex flex-wrap gap-2">
          {logos.map((logo) => (
            <span key={logo} className="rounded-full bg-muted px-3 py-1 text-sm">
              {logo}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
};
