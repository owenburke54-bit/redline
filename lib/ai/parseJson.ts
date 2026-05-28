/**
 * Extracts and parses a JSON object from Claude's response text.
 * Handles cases where Claude wraps the JSON in markdown code fences.
 * Throws a descriptive error if no valid JSON object is found.
 */
export function parseClaudeJson<T = unknown>(text: string): T {
  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const stripped = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();

  // Extract outermost JSON object
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object found in Claude response. Got: ${text.slice(0, 200)}`);
  }

  const jsonStr = stripped.slice(start, end + 1);

  try {
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    throw new Error(`Failed to parse JSON from Claude response: ${(err as Error).message}. Input: ${jsonStr.slice(0, 200)}`);
  }
}
