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

    function focusOnCreation(el) {
        el.focus();
    }
    let me;
    afterUpdate(() => {
        // Lol kinda wasteful but whatevs
        em = parseFloat(getComputedStyle(me).fontSize);
        if (isNaN(em)) em = 16;
    })
    function oninput(e: InputEvent) {
        // As far as I can tell, specifically when:
        //  - the cursor is at the end of the line
        //  - it is "connected" to a word
        //  - and the user presses enter
        // on android virtual keyboards, we dont get real input events
        // instead, we received a insertCompositionText with the current content
        console.log(e);
        if (e.inputType === "insertCompositionText" && typeof e.data === "string" &&
            e.data === title.slice(title.length - e.data.length)
        ) {
            e.preventDefault();
            dispatch("gotonext")
        }
    }
    // svelte doesn't have the right types here
    const untyped_oninput = oninput as any;
</script>
<div>
    <span>✔️</span>
<input bind:this={me} style="transform: translateX({$offset}px)"
    inputmode="search" 
    
    on:input={untyped_oninput}
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
        case "Backspace":
            if (title === "") {
                event.preventDefault();
                dispatch("destroy");
            }
            break;
        default:
        }
    }}
    bind:value={title}/>
</div>
<style>
div {
    position: relative;
    display: flex;
}
span {
    font-size: 1.8em;
    padding: 0.4em;
    position: absolute;
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