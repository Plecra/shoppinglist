<script lang="ts">
    import { tweened} from "svelte/motion";
    import { afterUpdate, createEventDispatcher } from "svelte";

    export let title: string;
    export let selected: boolean;
    const dispatch = createEventDispatcher();
    const selected_width = 2;
    
    const offset = tweened(0, {
        duration(a, b) { return (a - b); }
    });
    let startX = 0, currentX = 0;
    let em = 16;
    $: dragdistance = currentX - startX;
    $: offset.set((selected ? selected_width * em : 0) + dragdistance);
    $: {
        console.log(title);
        if (title === "") dispatch("destroy")
    }
    function focusOnCreation(el) {
        el.focus();
    }
    let me;
    afterUpdate(() => {
        if (me) {
            // Lol kinda wasteful but whatevs
            em = parseFloat(getComputedStyle(me).fontSize);
            if (isNaN(em)) em = 16;
        }
    })
</script>
<div>
    <span>✔️</span>
    <div>
        <div>
            <button on:click={
                function(e) {
                    dispatch("goup");
                }
            }>^</button>
            <button on:click={
                function(e) {
                    dispatch("godown");

                //   tasks.splice(i - 1,0, ...tasks.splice(i, 1));
                //   tasks = tasks;
                }
              }>v</button>
        </div>
<input bind:this={me} style="transform: translateX({$offset}px)"
    inputmode="search" 
    
    on:touchstart={e => {
        currentX = startX = e.touches[0].pageX;
    }}
    on:touchmove={e => {
        currentX = e.touches[0].pageX;
        if (Math.abs(currentX - startX) > 0.5 * em) {
            e.preventDefault();
        }
    }}
    on:touchend={function(e) {
        selected = currentX - startX > selected_width * em;
        startX = currentX = 0;
    }}
    use:focusOnCreation
    on:keydown={event => {
        switch (event.key) {
        case "Enter":
            event.preventDefault();
            if (!(event.shiftKey || event.altKey)) {
                if (event.ctrlKey) selected = true;
                else dispatch("gotonext");
            }
            break;
        default:
        }
    }}
    bind:value={title}/>
    </div>
</div>
<style>
div {
    position: relative;
    display: flex;
    background: white;
}
span {
    font-size: 1.8em;
    padding: 0.4em;
    position: absolute;
}
div>div>div {
    display: flex;
    flex-direction: column;
}
button {
    font-size: 1.6em;
    line-height: 0.4em;
    height: 50%;
    box-sizing: border-box;
    border: none;
    background: none;

}
  input {
    font-size: 1.8em;

    outline: none;
    border: none;
    width: 100%;
    padding: 0.4em;
    transition: transform 100ms;
  }
  input:focus {
    background: #F0F0FF;
    box-shadow: 0 0 2px 2px white inset;
    /* text-shadow: 0 0 80px #eef; */
  }
</style>