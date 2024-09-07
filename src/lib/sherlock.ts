import { runCommand } from "~/lib/utils";
import type { UserResult } from "~/types";

class Sherlock {
  FLAGS = [];

  async search(username: string) {
    const r = await runCommand(["sherlock", ...this.FLAGS, username]);
    const { output: res } = r;

    const cleanedRes: UserResult[] = res
      .split("\n")
      .map((v) => {
        const result = v.match(/\[\+\] (\w+): (https?:\/\/[^\s]+)/);

        if (result == null || result.length < 3) return null;

        const [original, org, url] = result;

        if (original == null || org == null || url == null) return null;

        return { original, org, url };
      })
      .filter((v) => v != null);

    return cleanedRes;
  }
}

export default Sherlock;
