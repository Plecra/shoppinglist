import { child, DatabaseReference, onChildAdded, onChildChanged, onChildMoved, orderByChild, orderByPriority, push, query, remove, set, setPriority, setWithPriority } from "firebase/database";

const textRegex = new RegExp("^[a-zA-Z0-9 ]*$");
let head_key: string | null = null;
type Record = {
    priority: number,
    prev_key: string | null,
    next_key: string | null,
};

const known_priorities = new Map<string, Record>();
export function bind_to_list(list: HTMLOListElement, ref: DatabaseReference) {
    const byPriority = query(ref, orderByChild("priority"));
    onChildAdded(byPriority, function(snapshot, _prev_key) {
        const { key } = snapshot;
        let { title, priority } = snapshot.val();
        if (typeof key !== "string") throw new Error("unexpected data");
        if (typeof priority !== "number") {
            priority = 0.0;
            set(child(child(ref, key), "priority"), priority);
        }
        if (typeof title !== "string") throw new Error("unexpected data");
        
        const prev_key = typeof _prev_key === "string" ? _prev_key : null;
        let next_key;
        if (prev_key === null) {
            next_key = head_key;
            head_key = key;
        } else {
            const record = known_priorities.get(prev_key);
            if (record === undefined) throw new ReferenceError("received a reference to an unknown key " + prev_key);
            next_key = record.next_key;
            record.next_key = key;
        }
        known_priorities.set(key, {
            priority,
            prev_key: prev_key,
            next_key: next_key,
        })
        const exiting_el = list.querySelector(`[data-key=${JSON.stringify(key)}]`);
        if (exiting_el instanceof HTMLLIElement) {
            throw new Error("um");
            exiting_el.textContent = title;
        } else {
            const new_line = document.createElement("li");
            new_line.innerHTML = title === "" ? "<br/>" : title;
            new_line.dataset.key = key;
            if (!(priority < 0.5)) new_line?.classList.add("complete");
            list.insertBefore(new_line, list.querySelector(`[data-key=${JSON.stringify(next_key)}]`));
        }
        if (next_key !== null) {
            const record = known_priorities.get(next_key);
            if (record === undefined) throw new ReferenceError("list of items invalid - contained reference to " + next_key)
            record.prev_key = key;
        }
    });
    onChildChanged(ref, function(snapshot) {
        const { title, priority } = snapshot.val();
        known_priorities.get(snapshot.key).priority = priority;
        const el = list.querySelector(`[data-key=${JSON.stringify(snapshot.key)}]`);
        if (el && el.textContent !== title) {
            el.textContent = title;
        }
        if (priority < 0.5) el?.classList.remove("complete");
        else el?.classList.add("complete");
    })
    onChildMoved(byPriority, function(snapshot, prev_key) {
        // head .. pred <-> me <-> succ .. old_pred <-> old_succ .. tail
        const child_key = snapshot.key;
        const record = snapshot.key === null ? undefined : known_priorities.get(snapshot.key);
        if (child_key === null || record === undefined) throw new ReferenceError("move of unknown key " + snapshot.key);
        const old_pred_key = record.prev_key;
        const old_succ_key = record.next_key;
        let succ_key;
        if (prev_key === null) {
            succ_key = head_key;
            head_key = child_key;
        } else {
            const pred = known_priorities.get(prev_key);
            if (pred === undefined) throw new ReferenceError("move to unknown key " + snapshot.key);
            // console.log("!!", pred);
            succ_key = pred.next_key;
            pred.next_key = child_key;
        }
        record.prev_key = prev_key;
        record.next_key = succ_key;
        if (record.next_key !== null) {
            const succ = known_priorities.get(record.next_key);
            if (succ === undefined) throw new ReferenceError("move to unknown key " + snapshot.key);
            succ.prev_key = child_key;
        }
        if (old_pred_key !== null) {
            const pred = known_priorities.get(old_pred_key);
            if (pred === undefined) throw new ReferenceError("move from unknown key " + snapshot.key);
            pred.next_key = old_succ_key;
        } else {
            head_key = old_succ_key;
        }
        if (old_succ_key !== null) {
            const succ = known_priorities.get(old_succ_key);
            if (succ === undefined) throw new ReferenceError("move from unknown key " + snapshot.key);
            succ.prev_key = old_pred_key;
        }
        // console.log(JSON.stringify(Object.fromEntries(known_priorities.entries()), null, 2), prev_key, succ_key)
        const succ_sibling = list.querySelector(`[data-key=${JSON.stringify(succ_key)}]`);
        const node = list.querySelector(`[data-key=${JSON.stringify(snapshot.key)}]`);
        node?.parentElement?.insertBefore(node, succ_sibling);
    });
    list.addEventListener("input", function(e: InputEvent) {
        switch (e.inputType) {
            case "insertText":
                if (typeof e.data === "string" && textRegex.test(e.data)) {
                    const in_row = window.getSelection()?.anchorNode;
                    if (!(in_row instanceof Text && in_row.parentElement instanceof HTMLLIElement)) throw new Error("uh");
                    const li = in_row.parentElement;
                    
                    if (typeof li.dataset.key !== "string") throw new Error("uhoh");
                    set(child(child(ref, li.dataset.key), "title"), li.textContent);
                    break;
                }
            case "insertParagraph":
                const item_ref = push(ref);
                const online = window.getSelection()?.anchorNode?.previousSibling;
                const sel = window.getSelection();
                if (sel === null || !(sel.anchorNode instanceof HTMLLIElement)) throw new Error("uh");
                sel.anchorNode.dataset.key = item_ref.key || undefined;
                
                const { next_key, priority } = known_priorities.get(online?.dataset.key);
                const next_record = known_priorities.get(next_key);
                const next_priority = next_record === undefined ? 1.0 : next_record.priority;
                set(item_ref, {
                    title: "",
                    priority: priority + (0.5 + (Math.random() - 0.5) * 0.2) * (next_priority - priority),
                })
                break;
            case "historyUndo": return;
            default:
                console.log(e)
                document.execCommand("undo", false, "");
                break;
        }
    })



    
    let startX = 0, startY = 0;
    let start_key: string | undefined = undefined;
    let still_in_drag = false;
    let dragstart = 0;
    let scroll_speed = 0;
    const style = document.createElement("style");
    document.head.append(style);

    function cancel_drag() {
        still_in_drag = false;
        scroll_speed = 0;
        style.textContent = "";
    }
    list.addEventListener("touchstart", function(e: TouchEvent) {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        if (!(touch.target instanceof HTMLLIElement)) return;
        startX = touch.pageX;
        startY = touch.pageY;
        start_key = touch.target.dataset.key;
        still_in_drag = true;
        dragstart = performance.now();
    });
    list.addEventListener("touchmove", function(e: TouchEvent) {
        if (e.touches.length !== 1) cancel_drag();
        if (!still_in_drag) return;
        const { pageX, pageY } = e.touches[0];
        const diffX = pageX - startX;
        const diffY = pageY - startY;
        if (performance.now() - dragstart > 150) {
            e.preventDefault();
            style.textContent = `
            [data-key=${JSON.stringify(start_key)}] {
                transform: translate(${diffX}px,${diffY}px);
                pointer-events: none;
            }
            `;
        } else if (diffX ** 2 + diffY ** 2 > Math.sqrt(12)) cancel_drag();
    });
    list.addEventListener("touchend", function(e: TouchEvent) {
        if (!start_key) return;
        const { clientX, clientY, pageX, pageY } = e.changedTouches[0];

        if (!still_in_drag) {
            const diffX = Math.abs(pageX - startX);
            const diffY = Math.abs(pageY - startY);
            if (diffY < diffX && diffX > 30) {
                const prev_priority = known_priorities.get(start_key).priority;
                set(child(child(ref, start_key), "priority"), prev_priority + prev_priority < 0.5 ? 0.5 : -0.5)
                // document.querySelector(`[data-key=${JSON.stringify(start_key)}]`)?.classList.toggle("complete")
            }
            return;
        }
        const drop_target = document.elementFromPoint(clientX, clientY);
        cancel_drag();
        if (!(drop_target instanceof HTMLLIElement)) throw new Error("bad target" + drop_target);
        const rect = drop_target?.getBoundingClientRect();
        if (rect === undefined) throw "";
        const { top, height } = rect;
        let prev_key = drop_target.dataset.key || null;
        if (clientY < top + height / 2) prev_key = known_priorities.get(prev_key).prev_key;
        const prev_record = known_priorities.get(prev_key || "");
        const next_key = prev_record === undefined ? head_key : prev_record.next_key;
        console.log(next_key, start_key);
        const priority = prev_record === undefined ? 0.0 : prev_record.priority;
        const next_priority = next_key === null ? 1.0 : known_priorities.get(next_key).priority;
        const new_priority = priority + (0.5 + (Math.random() - 0.5) * 0.2) * (next_priority - priority);

        set(child(child(ref, start_key), "priority"), new_priority);
    });
}