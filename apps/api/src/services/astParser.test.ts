import { parseFunctions } from "./astParser";

describe("astParser", () => {
  it("extracts JavaScript functions with metadata", () => {
    const jsCode = `
      function alpha(a, b) { return a + b; }
      const beta = async (input) => {
        function nested(x) { return x * 2; }
        return nested(input);
      };
    `;

    const result = parseFunctions(jsCode, "javascript");
    const names = result.map((fn) => fn.name);

    expect(names).toContain("alpha");
    expect(names).toContain("beta");
    expect(names).toContain("nested");

    const beta = result.find((fn) => fn.name === "beta");
    expect(beta?.isAsync).toBe(true);
    expect(beta?.nestingDepth).toBe(0);

    const nested = result.find((fn) => fn.name === "nested");
    expect(nested?.nestingDepth).toBe(1);
  });

  it("extracts Python functions with async metadata", () => {
    const pyCode = `
async def fetch_user(user_id):
    return user_id

def process(data):
    return data
`;

    const result = parseFunctions(pyCode, "python");
    const names = result.map((fn) => fn.name);

    expect(names).toContain("fetch_user");
    expect(names).toContain("process");

    const fetchUser = result.find((fn) => fn.name === "fetch_user");
    expect(fetchUser?.isAsync).toBe(true);
    expect(fetchUser?.startLine).toBeGreaterThan(0);
  });
});
