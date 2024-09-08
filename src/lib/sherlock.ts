import { runCommand, streamCommand } from "~/lib/utils";
import type { UserResult } from "~/types";

class Sherlock {
  FLAGS = [];

  parser(v: string): UserResult | null {
    const result = v.match(/\[\+\] (\w+): (https?:\/\/[^\s]+)/);
    if (result == null) return null;

    const [original, org, url] = result;
    if (original == null || org == null || url == null) return null;

    return { original, org, url };
  }

  async search(username: string) {
    const r = await runCommand(["sherlock", ...this.FLAGS, username]);
    const { output: res } = r;

    const cleanedRes = res
      .split("\n")
      .map((v) => this.parser(v))
      .filter((v) => v != null);

    return cleanedRes;
  }

  async *searchStream(username: string) {
    const r = await streamCommand(["sherlock", ...this.FLAGS, username]);
    const { output: res, final } = r;

    // @ts-expect-error bun's stream isn't typed properly
    for await (const v of res) {
      const converted = new TextDecoder().decode(v);
      const parsed = this.parser(converted);
      if (parsed != null) {
        yield parsed;
      }
    }

    return (await final())
      .split("\n")
      .map((v) => this.parser(v))
      .filter((v) => v != null);
  }
}

export default Sherlock;
