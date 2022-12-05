<script lang="ts">
  import Task from "./lib/Task.svelte";

  function randid() {
    return Math.floor(Math.random() * 10000)
  }
  let tasks = [{ title: "One", id: randid(), selected: false }];
  let me;
</script>

<main bind:this={me}>
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
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    width: 100%;
    overflow: hidden;
  }
</style>