import './app.css'
import App from './App.svelte'
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, set } from "firebase/database";

const firebaseApp = initializeApp({
  databaseURL: "https://shoppinglist-31849-default-rtdb.europe-west1.firebasedatabase.app/",
});
const database = getDatabase(firebaseApp);
const refname = import.meta.env.DEV ? "devitems" : "items";
const items = ref(database, refname);
// const new_item = push(items);
// set(new_item, "Apples");

const app = document.createElement('div');
new App({ target: app, props: { dbRef: items } });

if (document.readyState === "loading") document.addEventListener("readystatechange", ready, { once: true })
else ready.call(document, null)

function ready(_) {
  this.body.append(app);
}

