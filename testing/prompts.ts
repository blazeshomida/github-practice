import {
  block,
  ConfirmPrompt,
  MultiSelectPrompt,
  PasswordPrompt,
  SelectPrompt,
  TextPrompt,
} from "@clack/core";
import type { State } from "@clack/core";
import isUnicodeSupported from "is-unicode-supported";
import pc from "picocolors";
import { cursor, erase } from "sisteransi";

// Semantic color definitions
const colors = {
  primary: pc.cyan, // Used for primary actions and active elements, draws attention to key interfaces.
  secondary: pc.magenta, // Used for secondary actions, often for less critical actions or supplementary UI.
  success: pc.green, // Indicates successful operations or confirmations, encouraging feedback.
  error: pc.red, // Signifies errors, critical failures, and urgent negative outcomes.
  white: pc.white, // General-purpose color for text that requires a standard, clear presentation.
  bgWhite: pc.bgWhite, // Background color for emphasis or to distinguish sections of the UI.
  warning: pc.yellow, // Used for warnings or to draw attention to potential issues that need consideration.
  info: pc.blue, // Used for informational messages that provide guidance or system statuses.
  structural: pc.gray, // Used for structural elements in the UI, such as borders and separators.
  dim: pc.dim, // Subdued text for less emphasis, used for secondary information or less important data.
  disabled: pc.strikethrough, // Indicates disabled or unavailable options.
  inverse: pc.inverse, // Used for text that needs to stand out by inverting the usual foreground and background colors.
  hidden: pc.hidden, // Used to hide text, typically for sensitive or conditional display elements.
  reset: pc.reset, // Resets the coloring to default terminal colors, often used at the end of a styled line.
};

const unicode = isUnicodeSupported();
const s = (c: string, fallback: string) => (unicode ? c : fallback);
const S_STEP_ACTIVE = s("◇", "*");
const S_STEP_CANCEL = s("■", "x");
const S_STEP_ERROR = s("▲", "x");
const S_STEP_SUBMIT = s("◆", "o");

const S_BAR_START = s("┌", "T");
const S_BAR = s("│", "|");
const S_BAR_END = s("└", "—");

const S_RADIO_ACTIVE = s("●", ">");
const S_RADIO_INACTIVE = s("○", " ");
const S_CHECKBOX_ACTIVE = s("◻", "[•]");
const S_CHECKBOX_SELECTED = s("◼", "[+]");
const S_CHECKBOX_INACTIVE = s("◻", "[ ]");
const S_PASSWORD_MASK = s("▪", "•");

const S_BAR_H = s("─", "-");
const S_CORNER_TOP_RIGHT = s("╮", "+");
const S_CONNECT_LEFT = s("├", "+");
const S_CORNER_BOTTOM_RIGHT = s("╯", "+");

const S_INFO = s("●", "•");
const S_SUCCESS = s("◆", "*");
const S_WARN = s("▲", "!");
const S_ERROR = s("■", "x");

const symbol = (state: State) => {
  switch (state) {
    case "initial":
    case "active":
      return colors.white(S_STEP_ACTIVE);
    case "cancel":
      return colors.warning(S_STEP_CANCEL);
    case "error":
      return colors.error(S_STEP_ERROR);
    case "submit":
      return colors.primary(S_STEP_SUBMIT);
  }
};

interface LimitOptionsParams<TOption> {
  options: TOption[];
  maxItems: number | undefined;
  cursor: number;
  style: (option: TOption, active: boolean) => string;
}

const limitOptions = <TOption>(
  params: LimitOptionsParams<TOption>
): string[] => {
  const { cursor, options, style } = params;

  const paramMaxItems = params.maxItems ?? Infinity;
  const outputMaxItems = Math.max(process.stdout.rows - 4, 0);
  // We clamp to minimum 5 because anything less doesn't make sense UX wise
  const maxItems = Math.min(outputMaxItems, Math.max(paramMaxItems, 5));
  let slidingWindowLocation = 0;

  if (cursor >= slidingWindowLocation + maxItems - 3) {
    slidingWindowLocation = Math.max(
      Math.min(cursor - maxItems + 3, options.length - maxItems),
      0
    );
  } else if (cursor < slidingWindowLocation + 2) {
    slidingWindowLocation = Math.max(cursor - 2, 0);
  }

  const shouldRenderTopEllipsis =
    maxItems < options.length && slidingWindowLocation > 0;
  const shouldRenderBottomEllipsis =
    maxItems < options.length &&
    slidingWindowLocation + maxItems < options.length;

  return options
    .slice(slidingWindowLocation, slidingWindowLocation + maxItems)
    .map((option, i, arr) => {
      const isTopLimit = i === 0 && shouldRenderTopEllipsis;
      const isBottomLimit = i === arr.length - 1 && shouldRenderBottomEllipsis;
      return isTopLimit || isBottomLimit
        ? colors.dim("...")
        : style(option, i + slidingWindowLocation === cursor);
    });
};

export interface TextOptions {
  message: string;
  placeholder?: string;
  defaultValue?: string;
  initialValue?: string;
  validate?: (value: string) => string | undefined;
}
export const text = (opts: TextOptions) => {
  return new TextPrompt({
    validate: opts.validate,
    placeholder: opts.placeholder,
    defaultValue: opts.defaultValue,
    initialValue: opts.initialValue,
    render() {
      const title = `${colors.structural(S_BAR)}\n${symbol(this.state)}  ${
        opts.message
      }\n`;
      const placeholder = opts.placeholder
        ? colors.inverse(opts.placeholder[0]) +
          colors.dim(opts.placeholder.slice(1))
        : colors.inverse(colors.hidden("_"));
      const value = !this.value ? placeholder : this.valueWithCursor;

      switch (this.state) {
        case "error":
          return `${title.trim()}\n${colors.error(
            S_BAR
          )}  ${value}\n${colors.error(S_BAR_END)}  ${colors.error(
            this.error
          )}\n`;
        case "submit":
          return `${title}${colors.structural(S_BAR)}  ${colors.dim(
            this.value || opts.placeholder
          )}`;
        case "cancel":
          return `${title}${colors.structural(S_BAR)}  ${colors.disabled(
            colors.dim(this.value ?? "")
          )}${this.value?.trim() ? "\n" + colors.structural(S_BAR) : ""}`;
        default:
          return `${title}${colors.primary(S_BAR)}  ${value}\n${colors.primary(
            S_BAR_END
          )}\n`;
      }
    },
  }).prompt() as Promise<string | symbol>;
};

export interface PasswordOptions {
  message: string;
  mask?: string;
  validate?: (value: string) => string | undefined;
}
export const password = (opts: PasswordOptions) => {
  return new PasswordPrompt({
    validate: opts.validate,
    mask: opts.mask ?? S_PASSWORD_MASK,
    render() {
      const title = `${colors.structural(S_BAR)}\n${symbol(this.state)}  ${
        opts.message
      }\n`;
      const value = this.valueWithCursor;
      const masked = this.masked;

      switch (this.state) {
        case "error":
          return `${title.trim()}\n${colors.error(
            S_BAR
          )}  ${masked}\n${colors.error(S_BAR_END)}  ${colors.error(
            this.error
          )}\n`;
        case "submit":
          return `${title}${colors.structural(S_BAR)}  ${colors.dim(masked)}`;
        case "cancel":
          return `${title}${colors.structural(S_BAR)}  ${colors.disabled(
            colors.dim(masked ?? "")
          )}${masked ? "\n" + colors.structural(S_BAR) : ""}`;
        default:
          return `${title}${colors.primary(S_BAR)}  ${value}\n${colors.primary(
            S_BAR_END
          )}\n`;
      }
    },
  }).prompt() as Promise<string | symbol>;
};

export interface ConfirmOptions {
  message: string;
  active?: string;
  inactive?: string;
  initialValue?: boolean;
}
export const confirm = (opts: ConfirmOptions) => {
  const active = opts.active ?? "Yes";
  const inactive = opts.inactive ?? "No";
  return new ConfirmPrompt({
    active,
    inactive,
    initialValue: opts.initialValue ?? true,
    render() {
      const title = `${colors.structural(S_BAR)}\n${symbol(this.state)}  ${
        opts.message
      }\n`;
      const value = this.value ? active : inactive;

      switch (this.state) {
        case "submit":
          return `${title}${colors.structural(S_BAR)}  ${colors.dim(value)}`;
        case "cancel":
          return `${title}${colors.structural(S_BAR)}  ${colors.disabled(
            colors.dim(value)
          )}\n${colors.structural(S_BAR)}`;
        default: {
          return `${title}${colors.primary(S_BAR)}  ${
            this.value
              ? `${colors.primary(S_RADIO_ACTIVE)} ${active}`
              : `${colors.dim(S_RADIO_INACTIVE)} ${colors.dim(active)}`
          } ${colors.dim("/")} ${
            !this.value
              ? `${colors.primary(S_RADIO_ACTIVE)} ${inactive}`
              : `${colors.dim(S_RADIO_INACTIVE)} ${colors.dim(inactive)}`
          }\n${colors.primary(S_BAR_END)}\n`;
        }
      }
    },
  }).prompt() as Promise<boolean | symbol>;
};

type Primitive = Readonly<string | boolean | number>;

type Option<Value> = Value extends Primitive
  ? { value: Value; label?: string; hint?: string }
  : { value: Value; label: string; hint?: string };

export interface SelectOptions<Value> {
  message: string;
  options: Option<Value>[];
  initialValue?: Value;
  maxItems?: number;
}

export const select = <Value>(opts: SelectOptions<Value>) => {
  const opt = (
    option: Option<Value>,
    state: "inactive" | "active" | "selected" | "cancelled"
  ) => {
    const label = option.label ?? String(option.value);
    switch (state) {
      case "selected":
        return `${colors.primary(label)}`;
      case "active":
        return `${colors.dim(S_RADIO_ACTIVE)} ${label} ${
          option.hint ? colors.dim(`(${option.hint})`) : ""
        }`;
      case "cancelled":
        return `${colors.disabled(colors.dim(label))}`;
      default:
        return `${colors.dim(S_RADIO_INACTIVE)} ${colors.dim(label)}`;
    }
  };

  return new SelectPrompt({
    options: opts.options,
    initialValue: opts.initialValue,
    render() {
      const title = `${colors.structural(S_BAR)}\n${symbol(this.state)}  ${
        opts.message
      }\n`;

      switch (this.state) {
        case "submit":
          return `${title}${colors.structural(S_BAR)}  ${opt(
            this.options[this.cursor],
            "selected"
          )}`;
        case "cancel":
          return `${title}${colors.structural(S_BAR)}  ${opt(
            this.options[this.cursor],
            "cancelled"
          )}\n${colors.structural(S_BAR)}`;
        default: {
          return `${title}${colors.primary(S_BAR)}  ${limitOptions({
            cursor: this.cursor,
            options: this.options,
            maxItems: opts.maxItems,
            style: (item, active) => opt(item, active ? "active" : "inactive"),
          }).join(`\n${colors.primary(S_BAR)}  `)}\n${colors.primary(
            S_BAR_END
          )}\n`;
        }
      }
    },
  }).prompt() as Promise<Value | symbol>;
};

export interface MultiSelectOptions<Value> {
  message: string;
  options: Option<Value>[];
  initialValues?: Value[];
  maxItems?: number;
  required?: boolean;
  cursorAt?: Value;
}
export const multiselect = <Value>(opts: MultiSelectOptions<Value>) => {
  const opt = (
    option: Option<Value>,
    state:
      | "inactive"
      | "active"
      | "selected"
      | "active-selected"
      | "submitted"
      | "cancelled"
  ) => {
    const label = option.label ?? String(option.value);
    if (state === "active") {
      return `${colors.primary(S_CHECKBOX_ACTIVE)} ${label} ${
        option.hint ? colors.dim(`(${option.hint})`) : ""
      }`;
    } else if (state === "selected") {
      return `${colors.primary(S_CHECKBOX_SELECTED)} ${colors.dim(label)}`;
    } else if (state === "cancelled") {
      return `${colors.disabled(colors.dim(label))}`;
    } else if (state === "active-selected") {
      return `${colors.primary(S_CHECKBOX_SELECTED)} ${label} ${
        option.hint ? colors.dim(`(${option.hint})`) : ""
      }`;
    } else if (state === "submitted") {
      return `${colors.dim(label)}`;
    }
    return `${colors.dim(S_CHECKBOX_INACTIVE)} ${colors.dim(label)}`;
  };

  return new MultiSelectPrompt({
    options: opts.options,
    initialValues: opts.initialValues,
    required: opts.required ?? true,
    cursorAt: opts.cursorAt,
    validate(selected: Value[]) {
      if (this.required && selected.length === 0)
        return `Please select at least one option.\n${colors.reset(
          colors.dim(
            `Press ${colors.structural(
              colors.bgWhite(colors.inverse(" space "))
            )} to select, ${colors.structural(
              colors.bgWhite(colors.inverse(" enter "))
            )} to submit`
          )
        )}`;
    },
    render() {
      const title = `${colors.structural(S_BAR)}\n${symbol(this.state)}  ${
        opts.message
      }\n`;

      const styleOption = (option: Option<Value>, active: boolean) => {
        const selected = this.value.includes(option.value);
        if (active && selected) {
          return opt(option, "active-selected");
        }
        if (selected) {
          return opt(option, "selected");
        }
        return opt(option, active ? "active" : "inactive");
      };

      switch (this.state) {
        case "submit": {
          return `${title}${colors.structural(S_BAR)}  ${
            this.options
              .filter(({ value }) => this.value.includes(value))
              .map((option) => opt(option, "submitted"))
              .join(colors.dim(", ")) || colors.dim("none")
          }`;
        }
        case "cancel": {
          const label = this.options
            .filter(({ value }) => this.value.includes(value))
            .map((option) => opt(option, "cancelled"))
            .join(colors.dim(", "));
          return `${title}${colors.structural(S_BAR)}  ${
            label.trim() ? `${label}\n${colors.structural(S_BAR)}` : ""
          }`;
        }
        case "error": {
          const footer = this.error
            .split("\n")
            .map((ln, i) =>
              i === 0
                ? `${colors.error(S_BAR_END)}  ${colors.error(ln)}`
                : `   ${ln}`
            )
            .join("\n");
          return (
            title +
            colors.error(S_BAR) +
            "  " +
            limitOptions({
              options: this.options,
              cursor: this.cursor,
              maxItems: opts.maxItems,
              style: styleOption,
            }).join(`\n${colors.error(S_BAR)}  `) +
            "\n" +
            footer +
            "\n"
          );
        }
        default: {
          return `${title}${colors.primary(S_BAR)}  ${limitOptions({
            options: this.options,
            cursor: this.cursor,
            maxItems: opts.maxItems,
            style: styleOption,
          }).join(`\n${colors.primary(S_BAR)}  `)}\n${colors.primary(
            S_BAR_END
          )}\n`;
        }
      }
    },
  }).prompt() as Promise<Value[] | symbol>;
};

const strip = (str: string) => str.replace(ansiRegex(), "");
export const note = (message = "", title = "") => {
  const lines = `\n${message}\n`.split("\n");
  const titleLen = strip(title).length;
  const len =
    Math.max(
      lines.reduce((sum, ln) => {
        ln = strip(ln);
        return ln.length > sum ? ln.length : sum;
      }, 0),
      titleLen
    ) + 2;
  const msg = lines
    .map(
      (ln) =>
        `${colors.structural(S_BAR)}  ${colors.dim(ln)}${" ".repeat(
          len - strip(ln).length
        )}${colors.structural(S_BAR)}`
    )
    .join("\n");
  process.stdout.write(
    `${colors.structural(S_BAR)}\n${colors.primary(
      S_STEP_SUBMIT
    )}  ${colors.reset(title)} ${colors.structural(
      S_BAR_H.repeat(Math.max(len - titleLen - 1, 1)) + S_CORNER_TOP_RIGHT
    )}\n${msg}\n${colors.structural(
      S_CONNECT_LEFT + S_BAR_H.repeat(len + 2) + S_CORNER_BOTTOM_RIGHT
    )}\n`
  );
};

export const cancel = (message = "") => {
  process.stdout.write(
    `${colors.structural(S_BAR_END)}  ${colors.warning(message)}\n\n`
  );
};

export const intro = (title = "") => {
  process.stdout.write(`${colors.structural(S_BAR_START)}  ${title}\n`);
};

export const outro = (message = "") => {
  process.stdout.write(
    `${colors.structural(S_BAR)}\n${colors.structural(
      S_BAR_END
    )}  ${message}\n\n`
  );
};

export interface LogMessageOptions {
  symbol?: string;
}

export const log = {
  message: (
    message = "",
    { symbol = colors.structural(S_BAR) }: LogMessageOptions = {}
  ) => {
    const parts = [`${colors.structural(S_BAR)}`];
    if (message) {
      const [firstLine, ...lines] = message.split("\n");
      parts.push(
        `${symbol}  ${firstLine}`,
        ...lines.map((ln) => `${colors.structural(S_BAR)}  ${ln}`)
      );
    }
    process.stdout.write(`${parts.join("\n")}\n`);
  },
  info: (message: string) => {
    log.message(message, { symbol: colors.info(S_INFO) });
  },
  success: (message: string) => {
    log.message(message, { symbol: colors.success(S_SUCCESS) });
  },
  step: (message: string) => {
    log.message(message, { symbol: colors.primary(S_STEP_SUBMIT) });
  },
  warn: (message: string) => {
    log.message(message, { symbol: colors.warning(S_WARN) });
  },
  /** alias for `log.warn()`. */
  warning: (message: string) => {
    log.warn(message);
  },
  error: (message: string) => {
    log.message(message, { symbol: colors.error(S_ERROR) });
  },
};

export const spinner = () => {
  const frames = unicode ? ["◒", "◐", "◓", "◑"] : ["•", "o", "O", "0"];
  const delay = unicode ? 80 : 120;

  let unblock: () => void;
  let loop: NodeJS.Timeout;
  let isSpinnerActive = false;
  let _message = "";

  const handleExit = (code: number) => {
    const msg = code > 1 ? "Something went wrong" : "Canceled";
    if (isSpinnerActive) stop(msg, code);
  };

  const errorEventHandler = () => handleExit(2);
  const signalEventHandler = () => handleExit(1);

  const registerHooks = () => {
    // Reference: https://nodejs.org/api/process.html#event-uncaughtexception
    process.on("uncaughtExceptionMonitor", errorEventHandler);
    // Reference: https://nodejs.org/api/process.html#event-unhandledrejection
    process.on("unhandledRejection", errorEventHandler);
    // Reference Signal Events: https://nodejs.org/api/process.html#signal-events
    process.on("SIGINT", signalEventHandler);
    process.on("SIGTERM", signalEventHandler);
    process.on("exit", handleExit);
  };

  const clearHooks = () => {
    process.removeListener("uncaughtExceptionMonitor", errorEventHandler);
    process.removeListener("unhandledRejection", errorEventHandler);
    process.removeListener("SIGINT", signalEventHandler);
    process.removeListener("SIGTERM", signalEventHandler);
    process.removeListener("exit", handleExit);
  };

  const start = (msg = ""): void => {
    isSpinnerActive = true;
    unblock = block();
    _message = msg.replace(/\.+$/, "");
    process.stdout.write(`${colors.structural(S_BAR)}\n`);
    let frameIndex = 0;
    let dotsTimer = 0;
    registerHooks();
    loop = setInterval(() => {
      const frame = colors.secondary(frames[frameIndex]);
      const loadingDots = ".".repeat(Math.floor(dotsTimer)).slice(0, 3);
      process.stdout.write(cursor.move(-999, 0));
      process.stdout.write(erase.down(1));
      process.stdout.write(`${frame}  ${_message}${loadingDots}`);
      frameIndex = frameIndex + 1 < frames.length ? frameIndex + 1 : 0;
      dotsTimer = dotsTimer < frames.length ? dotsTimer + 0.125 : 0;
    }, delay);
  };

  const stop = (msg = "", code = 0): void => {
    _message = msg ?? _message;
    isSpinnerActive = false;
    clearInterval(loop);
    const step =
      code === 0
        ? colors.primary(S_STEP_SUBMIT)
        : code === 1
        ? colors.warning(S_STEP_CANCEL)
        : colors.error(S_STEP_ERROR);
    process.stdout.write(cursor.move(-999, 0));
    process.stdout.write(erase.down(1));
    process.stdout.write(`${step}  ${_message}\n`);
    clearHooks();
    unblock();
  };

  const message = (msg = ""): void => {
    _message = msg ?? _message;
  };

  return {
    start,
    stop,
    message,
  };
};

// Adapted from https://github.com/chalk/ansi-regex
// @see LICENSE
function ansiRegex() {
  const pattern = [
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))",
  ].join("|");

  return new RegExp(pattern, "g");
}

export interface Task {
  /**
   * Task title
   */
  title: string;
  /**
   * Task function
   */
  task: (
    message: (string: string) => void
  ) => string | Promise<string> | undefined | Promise<void>;

  /**
   * If enabled === false the task will be skipped
   */
  enabled?: boolean;
}

/**
 * Define a group of tasks to be executed
 */
export const tasks = async (tasks: Task[]) => {
  for (const task of tasks) {
    if (task.enabled === false) continue;

    const s = spinner();
    s.start(task.title);
    const result = await task.task(s.message);
    s.stop(result || task.title);
  }
};
