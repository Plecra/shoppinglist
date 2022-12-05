import './app.css'
import App from './App.svelte'
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, set, onValue } from "firebase/database";
import { readable } from 'svelte/store';

const firebaseApp = initializeApp({
  databaseURL: "https://shoppinglist-31849-default-rtdb.europe-west1.firebasedatabase.app/",
});
const database = getDatabase(firebaseApp);
const refname = import.meta.env.DEV ? "devitems" : "items";
const items = ref(database, refname);
// const new_item = push(items);
// set(new_item, "Apples");
const connected = readable(false,  function(set) {
  return onValue(ref(database, "/.info/connected"), function(snapshot) {
    set(snapshot.val())
  })
});
const app = document.createElement('div');
new App({ target: app, props: { dbRef: items, connected } });

if (document.readyState === "loading") document.addEventListener("readystatechange", ready, { once: true })
else ready.call(document, null)

function ready(_) {
  this.body.append(app);
}

