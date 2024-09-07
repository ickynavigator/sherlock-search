import { readableStreamToText, spawn } from "bun";

export const runCommand = async (command: string[]) => {
  const process = spawn(command);
  const output = await readableStreamToText(process.stdout);

  return {
    output,
  };
};
