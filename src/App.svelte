<script lang="ts">
  import { onValue, set, type DatabaseReference } from "firebase/database";
  import { onDestroy } from "svelte";
  import type { Readable } from "svelte/store";
  import { onMount } from "svelte";
  import Task from "./lib/Task.svelte";
  export let dbRef: DatabaseReference;
  export let connected: Readable<boolean>;
  function randid() {
    return Math.floor(Math.random() * 10000)
  }
  let tasks = [{ title: "Loading...", id: randid(), selected: false }];
  let lastlocalupdate = 0;
  let lastremoterecording = 0;
  let loaded = false;
  let wejustgotamessagefromtheserver = false;
  $: {
    if (loaded && !wejustgotamessagefromtheserver) {
      lastremoterecording = lastlocalupdate = Date.now();
      set(dbRef, { recordedat: lastremoterecording, values: tasks.map(({ title, id }) => ({ title, id })) });
    }
    wejustgotamessagefromtheserver = false;
  }
  lastlocalupdate = 0;
  onDestroy(onValue(dbRef, function(snapshot) {
    const val = snapshot.val();
    loaded = true;
    if (val === null) return; // we're the first ones on this list
    lastremoterecording = val.recordedat;
    if (lastlocalupdate < lastremoterecording) {
      const newtasks = snapshot.val().values.map(({ title, id }) => ({ title, id, selected: false }));
      for (const task of tasks) {
        for (const newtask of newtasks) {
          if (newtask.id === task.id) newtask.selected = task.selected;
        }
      }
      tasks = newtasks;
      lastlocalupdate = lastremoterecording;
    }
    wejustgotamessagefromtheserver = true;
  }))
  let me;
  let footer;
  // no idea y, but the browser randomly scrolls to the wrong place. if the element has been thrown off-screen, recenter it
  // we do this whenever the viewport or focused element changes
  function ensure_input_in_viewport() {
    const el = document.activeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const heightoftrueviewport = (window.visualViewport.height - ("virtualKeyboard" in navigator ? navigator.virtualKeyboard.boundingRect.height : 0)) - 60;
    if (rect.y < 0 || rect.y + rect.height > heightoftrueviewport)
        window.scrollTo(0, rect.y + window.visualViewport.pageTop);
  }
  let pending = false;
  function updateheight() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function() {
      pending = false;
      
      // footer.style.top = `${window.visualViewport.height + window.visualViewport.pageTop - footer.getBoundingClientRect().height}px`;
      // footer.style.bottom = ``;
      // footer.style.bottom = `calc(100vh - env(keyboard-inset-bottom, 0px))`;
      // footer.style.bottom = `calc(100vh - env(keyboard-inset-bottom, 0px))`;
      ensure_input_in_viewport();
    });
  }
  const aborter = new AbortController();
  
  window.visualViewport.addEventListener("resize", updateheight, aborter);
  window.visualViewport.addEventListener("scroll", updateheight, aborter);
  window.addEventListener("scroll", updateheight, aborter);
  onDestroy(function() {
    aborter.abort();
  })
  onMount(() => {
    updateheight();
  });
  if ("virtualKeyboard" in navigator) {
    // @ts-ignore
    navigator.virtualKeyboard.overlaysContent = true;
  }
</script>

{#if !$connected}
  <div class="disconnected">We are not connected</div>
{/if}
<main on:focusin={() => setTimeout(() => ensure_input_in_viewport, 160)} bind:this={me}>
  <!-- {#each tasks as { title, selected, id }, i (id)} -->
  {#each tasks as { title, selected, id }, i (id)}
    <Task bind:title bind:selected
    on:goup={() => {
      tasks.splice(i - 1,0, ...tasks.splice(i, 1));
      tasks = tasks;
    }}
    on:godown={() => {
      tasks.splice(i + 1,0, ...tasks.splice(i, 1));
      tasks = tasks;
    }}
      on:gotonext={() => {
        tasks.splice(i + 1, 0, { title: "", id: randid(), selected: false });
        tasks = tasks;
      }}
      on:destroy={() => {
        tasks.splice(i, 1);
        tasks = tasks;

        // Quick hack to give us focus where we want it
        const prev_child = me.querySelector(`:nth-child(${i})`);
        if (prev_child) prev_child.focus();
      }}
    />
  {/each}
</main>
<nav bind:this={footer}>
  <button on:click={() => {
    for (let i = tasks.length - 1; i >= 0; i--) {
      if (tasks[i].selected) {
        tasks.splice(i, 1);
        
      }
    }
    tasks = tasks;
    lastlocalupdate = Date.now();
  }}>🗑</button>
  <button on:click={() => {
    tasks.push({ title: "", id: randid(), selected: false })
    tasks = tasks;
    lastlocalupdate = Date.now();
  }}>+</button>
</nav>

<style>
  .disconnected {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 70%);
    z-index: 100;
    color: white;
    text-align: center;
    vertical-align: center;
  }
  nav {
    position: fixed;
    width: 100%;
    left: 0;
    bottom: env(keyboard-inset-height, 0px);
    display: flex;
    flex-direction: row-reverse;
    border-top: grey 1px solid;
    background: white;
  }
  button {
    background: none;
    
    padding: 1.6em;
    border: none;
    border-left: grey 1px solid
  }
  main {
    display: flex;
    flex-direction: column;
    width: 100%;
    overflow: hidden;
    padding-bottom: calc(6em + env(keyboard-inset-height, 0px));
  }
</style>