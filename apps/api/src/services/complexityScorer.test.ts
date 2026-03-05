import { ParsedFunction } from "@codesense/shared";
import { scoreComplexity } from "./complexityScorer";

const makeFunction = (name: string, source: string): ParsedFunction => ({
  name,
  startLine: 1,
  endLine: source.split("\n").length,
  source,
  parameters: [],
  isAsync: false,
  nestingDepth: 0,
  language: "javascript"
});

describe("complexityScorer", () => {
  it("computes cyclomatic complexity for five known functions", () => {
    const functions: ParsedFunction[] = [
      makeFunction("simple", `function simple() { return 1; }`),
      makeFunction("singleIf", `function singleIf(a){ if (a) { return 1; } return 0; }`),
      makeFunction(
        "loops",
        `function loops(items){ for (const item of items) { if(item) { return item; } } while(false){} return null; }`
      ),
      makeFunction(
        "switchCatch",
        `function switchCatch(x){ try { switch(x){ case 1: return 1; case 2: return 2; default: return 0; } } catch(e){ return -1; } }`
      ),
      makeFunction("ternaryLogic", `function ternaryLogic(a,b){ return a || b ? a : b; }`)
    ];

    const result = scoreComplexity(functions);
    const byName = new Map(result.functions.map((item) => [item.functionName, item.complexity]));

    expect(byName.get("simple")).toBe(1);
    expect(byName.get("singleIf")).toBe(2);
    expect(byName.get("loops")).toBeGreaterThanOrEqual(4);
    expect(byName.get("switchCatch")).toBeGreaterThanOrEqual(4);
    expect(byName.get("ternaryLogic")).toBeGreaterThanOrEqual(2);

    expect(result.averageComplexity).toBeGreaterThan(0);
    expect(result.healthScore).toBeGreaterThanOrEqual(0);
    expect(result.healthScore).toBeLessThanOrEqual(100);
  });
});
