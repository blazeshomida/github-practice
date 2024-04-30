#! /bin/env node
import { Command } from "commander";
import { intro, outro, note, text, multiselect, spinner } from "./prompts.ts";
import path from "path";
import copy from "ncp";
import fs from "fs";
const program = new Command();
const templatesDir = path.join(path.dirname(__dirname), "src");
const s = spinner();
program
  .name("frame-x")
  .description("Practice project scaffolding for any project.")
  .version("0.0.1");

program
  .command("new")
  .description("Create a new project.")
  .option("--typescript", "Typescript project")
  .action(async () => {
    note("😁 Let's create a new project");
    intro("Ready?");

    const targetDirAnswer = await text({
      message: "What directory?",
    });

    if (typeof targetDirAnswer !== "string") return;
    const targetDir = path.join(process.cwd(), targetDirAnswer);
    await multiselect({
      message: "Select your tool(s)",
      options: [
        { value: "typescript", label: "Typescript" },
        { value: "eslint", label: "ESLint" },
        { value: "prettier", label: "Prettier" },
      ],
    });
    s.start("Start");
    await new Promise((res) => setTimeout(res, 2000));
    s.message("Spinning");
    s.stop("Done");

    if (!fs.existsSync(targetDir)) {
      copy(templatesDir, targetDir, (err) => {
        if (err) {
          console.log(err?.join(","));
        }
      });
    }
    outro("Perfect lets go!!");
  });

program
  .command("add <tool(s)...>")
  .description("Add a tool(s)")
  .action((opts) => console.error(opts));

program.parse(process.argv);
