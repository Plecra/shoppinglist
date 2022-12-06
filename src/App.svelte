<script lang="ts">
  import { onValue, set, type DatabaseReference } from "firebase/database";
  import { onDestroy } from "svelte";
  import type { Readable } from "svelte/store";
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
  let height = window.visualViewport.height;
</script>

<svelte:window on:resize={e => height = window.visualViewport.height}/>
{#if !$connected}
  <div class="disconnected">We are not connected</div>
{/if}
<main bind:this={me}>
  <!-- {#each tasks as { title, selected, id }, i (id)} -->
  {#each tasks as { title, selected, id }, i (id)}
    <Task bind:title bind:selected
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
  <nav style="bottom: calc(100% - {height}px);">
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
</main>

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
  }
</style>