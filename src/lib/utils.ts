import { readableStreamToText, spawn } from "bun";

export const runCommand = async (command: string[]) => {
  const process = spawn(command);
  const output = await readableStreamToText(process.stdout);

  return {
    output,
  };
};

export const streamCommand = async (command: string[]) => {
  const process = spawn(command, { stdout: "pipe" });
  const output = process.stdout;

  return {
    output,
    final: async () => await readableStreamToText(output),
  };
};
