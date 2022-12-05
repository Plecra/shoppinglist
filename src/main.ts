import './app.css'
import App from './App.svelte'
const app = document.createElement('div');
new App({ target: app });

if (document.readyState === "loading") document.addEventListener("readystatechange", ready, { once: true })
else ready.call(document, null)

function ready(_) {
  this.body.append(app);
}

