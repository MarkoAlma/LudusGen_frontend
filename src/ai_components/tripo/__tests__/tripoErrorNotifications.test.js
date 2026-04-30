import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, "../TripoPanel.jsx"), "utf8");

assert(
  source.includes("const ERROR_NOTICE_AUTO_DISMISS_MS = 10_000;"),
  "Tripo error notifications should stay visible for 10 seconds before auto-dismiss",
);
assert(
  source.includes("const [errorNotices, setErrorNotices] = useState([]);"),
  "TripoPanel should track stacked error notices independently from the latest error message",
);
assert(
  source.includes("enqueueErrorNotice(errorMsg);"),
  "new Tripo errors should be promoted into the stacked notification queue",
);
assert(
  source.includes("setErrorMsg(\"\");"),
  "the latest error trigger should reset after queueing so repeated identical errors can still reappear",
);
assert(
  source.includes("errorNotices.map((notice) => ("),
  "TripoPanel should render one visible banner per queued error",
);
assert(
  source.includes("onClick={() => dismissErrorNotice(notice.id)}"),
  "each stacked Tripo error banner should be dismissible with its own close button",
);

console.log("tripoErrorNotifications assertions passed");
