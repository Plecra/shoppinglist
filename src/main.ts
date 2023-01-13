import { initializeApp } from "firebase/app";
import {  child, getDatabase, onChildAdded, onChildChanged, onChildMoved, onChildRemoved, orderByChild, push, query, ref, remove, set, setWithPriority } from "firebase/database";

import './app.css'
import { bind_to_list } from "./lib/listbind";


const firebaseApp = initializeApp({
  databaseURL: "https://shoppinglist-31849-default-rtdb.europe-west1.firebasedatabase.app/",
});
const database = getDatabase(firebaseApp);

const list = document.createElement("ol");
list.contentEditable = "true";
let elements: { li: HTMLLIElement, title: string }[] = [];

const replicated_list = ref(database, "testspace");
const byPriority = query(replicated_list, orderByChild("priority"));
onChildAdded(byPriority, function(snapshot, _prev_key) {
  const { key } = snapshot;
  const { title, priority } = snapshot.val();
  if (typeof key !== "string") throw new Error("unexpected data");
  if (typeof priority !== "number") {
    remove(child(replicated_list, key))
    throw new Error("unexpected data" + JSON.stringify(snapshot.val()));
  }
  if (typeof title !== "string") throw new Error("unexpected data");

  // This is a locally submitted line, we've already got the content available.
  if (list.querySelector(`[data-key=${JSON.stringify(key)}]`)) return;
  console.log("making", key, list.querySelector(`[data-key=${JSON.stringify(key)}]`));

  const new_line = document.createElement("li");
  if (title == "") new_line.appendChild(document.createElement("br"));
  else new_line.innerText = title;
  if (priority > 0.5) new_line?.classList.add("complete");

  new_line.dataset.key = key;
  new_line.dataset.priority = priority.toString();

  list.insertBefore(new_line, list.querySelector(`[data-key=${JSON.stringify(_prev_key)}]`)?.nextSibling);
  elements = [...list.childNodes].map(node => ({ li: node as HTMLLIElement, title: node.textContent || "" }));
});
onChildRemoved(byPriority, function(snapshot) {
    const li = list.querySelector(`[data-key=${JSON.stringify(snapshot.key)}]`);
    if (li) li.remove();
    elements = [...list.childNodes].map(node => ({ li: node as HTMLLIElement, title: node.textContent || "" }));
});
onChildMoved(byPriority, function(snapshot, prev_key) {
    const prev_sibling = list.querySelector(`[data-key=${JSON.stringify(prev_key)}]`);
    const node = list.querySelector(`[data-key=${JSON.stringify(snapshot.key)}]`);
    node?.parentElement?.insertBefore(node, prev_sibling ? prev_sibling.nextSibling : node?.parentElement.firstChild);
    elements = [...list.childNodes].map(node => ({ li: node as HTMLLIElement, title: node.textContent || "" }));
});
onChildChanged(byPriority, function(snapshot) {
  const { title, priority } = snapshot.val();
  const el = list.querySelector(`[data-key=${JSON.stringify(snapshot.key)}]`);

  el.dataset.priority = priority;
  if (el && el.textContent !== title) {
      
      if (title == "") el.replaceChildren(document.createElement("br"));
      else el.innerText = title;
  }
  if (priority > 0.5) el?.classList.add("complete");
  else el?.classList.remove("complete");
    
  elements = [...list.childNodes].map(node => ({ li: node as HTMLLIElement, title: node.textContent || "" }));
})
const li = document.createElement("li");
li.append(document.createElement("br"));
elements.push({ li, title: "" });
list.append(li)
list.addEventListener("input", function() {
  const diff = [];
  const new_elements: { li: HTMLLIElement, title: string }[] = [];
  let known_el_i = 0;
  let current_i = 0;
  while (current_i < list.childNodes.length && known_el_i < elements.length) {
    const li = list.childNodes[current_i];
    assert_instanceof(li, HTMLLIElement);
    const new_element = { li: li as HTMLLIElement, title: li.textContent || "" };
    const expected_el = elements[known_el_i];
    if (expected_el.li !== new_element.li) {
      if (expected_el.li.parentElement === list) {
        // an element has been added
        current_i += 1;
        new_elements.push(new_element);
        diff.push(["add", new_element]);
        continue;
      } else {
        // that element was removed
        known_el_i += 1;
        diff.push(["remove", expected_el]);
        continue;
      }
    } else if (expected_el.title !== new_element.title) {
      diff.push(["change", expected_el.title, new_element]);
    }
    known_el_i += 1;
    current_i += 1;
    new_elements.push(new_element);
  }
  for (; current_i < list.childNodes.length; current_i++) {
    const li = list.childNodes[current_i];
    assert_instanceof(li, HTMLLIElement);
    const new_element = { li: li as HTMLLIElement, title: li.textContent || "" };
    new_elements.push(new_element);
    diff.push(["add", new_element]);
  }
  for (; known_el_i < elements.length; known_el_i++) diff.push(["remove", elements[known_el_i]]);
  elements = new_elements;
  for (const change of diff) {
    switch (change[0]) {
      case "add": {
        const { li, title } = change[1];
        const item = push(replicated_list);
        const priority = make_priority(li.previousSibling, li.nextSibling);
        li.dataset.key = item.key;
        li.dataset.priority = priority;
        set(item, { title, priority });
        break;
      }
      case "change": {
        const { li, title } = change[2];
        set(child(child(replicated_list, li.dataset.key), "title"), title);
        break;
      }
      case "remove": {
        const { li, title } = change[1];
        remove(child(replicated_list, li.dataset.key));
        break;
      }
      default: throw new Error("lol")
    }
  }
})
function make_priority(after: HTMLLIElement, before: HTMLLIElement): number {
  const prev_priority = after ? parseFloat(after.dataset.priority) : 0;
  const next_priority = before ? parseFloat(before.dataset.priority) : 1;
  return prev_priority + (next_priority - prev_priority) * ((Math.random() - 0.5) * 0.2 + 0.5);
}
function assert_instanceof(instance: any, cls: any): void {
  if (instance instanceof cls) return;
  throw new Error("Expected a " + cls + ": " + JSON.stringify(instance));
}
// bind_to_list(list, ref(database, "testspace"))
// remove(ref(database, "testspace"))
// set(push(ref(database, "testspace")), { title: "one", priority: 0.25 })
// set(push(ref(database, "testspace")), { title: "two", priority: 0.5 })
// set(push(ref(database, "testspace")), { title: "three", priority: 0.75 })
if (document.readyState === "loading") document.addEventListener("readystatechange", ready, { once: true })
else ready.call(document, null)

function ready(this: Document, _: unknown) {
  this.body.append(list);
  list.dispatchEvent(new Event("mount"));
}

