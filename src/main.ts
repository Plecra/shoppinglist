import { initializeApp } from "firebase/app";
import {  getDatabase, push, ref, remove, set, setWithPriority } from "firebase/database";

import './app.css'
import { bind_to_list } from "./lib/listbind";


const firebaseApp = initializeApp({
  databaseURL: "https://shoppinglist-31849-default-rtdb.europe-west1.firebasedatabase.app/",
});
const database = getDatabase(firebaseApp);

const list = document.createElement("ol");
list.contentEditable = "true";

bind_to_list(list, ref(database, "testspace"))
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

