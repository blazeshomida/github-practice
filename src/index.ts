#! /bin/env node

import { Command } from "commander";
import { intro, outro, log, note, multiselect } from "./prompts.ts";
import color from "picocolors";
const program = new Command();
program
  .name("frame-x")
  .description("Practice project scaffolding for any project.")
  .version("0.0.1");

program
  .command("new")
  .description("Create a new project.")
  .option("--typescript", "Typescript project")
  .action(async (opts: Record<string, string>) => {
    note("Let's create a new project");
    intro("Ready?");
    log.error(color.red(JSON.stringify(opts)));
    await multiselect({
      message: "Select your tool(s)",
      options: [
        { value: "typescript", label: "Typescript" },
        { value: "eslint", label: "ESLint" },
        { value: "prettier", label: "Prettier" },
      ],
    });
    log.info(color.blue(JSON.stringify(opts)));
    outro("Perfect lets go!!");
  });

program
  .command("add <tool(s)...>")
  .description("Add a tool(s)")
  .action((opts) => console.error(opts));

program.parse(process.argv);
