import './app.css'
import { installHandlers } from "./lib/handlers";
import { value_update } from './lib/util';

const list = document.createElement("ol");
list.contentEditable = "true";

// App invariant: at the end of every event, we have a DOM such that
// <ol contenteditable>
//   for (item of items) <li>if (item === "") <br/> else ${item}</li>
// </ol>
const items = [""];
value_update(["items", 0], "insert", null);

let controller = new AbortController();
installHandlers(list, items, controller.signal)
if (import.meta.hot) {
  type InstallHandlers = typeof installHandlers;
  import.meta.hot.accept("./lib/handlers", namespace => {
    const installHandlers: InstallHandlers = namespace?.installHandlers;
    controller.abort();
    controller = new AbortController();
    installHandlers(list, items, controller.signal);
  })
}

if (document.readyState === "loading") document.addEventListener("readystatechange", ready, { once: true })
else ready.call(document, null)

function ready(this: Document, _: unknown) {
  this.body.append(list);
  list.dispatchEvent(new Event("mount"));
}

