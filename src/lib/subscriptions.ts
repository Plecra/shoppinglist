import { Database, onChildAdded, onChildChanged, onChildMoved, onChildRemoved, onValue, orderByPriority, push, query, ref, serverTimestamp, set, setPriority, setWithPriority } from "firebase/database";

function binary_search<T>(list: T[], compare: (item: T) => number): number {
    let start = 0;
    let end = list.length - 1;
  
    while (start <= end) {
        const middle = Math.floor((start + end) / 2);
        const sort = compare(list[middle]);
        if (sort > 0) {
            start = middle + 1;
        } else if (sort < 0) {
            end = middle - 1;
        } else return middle;
    }
    return start;
}
function assert<T>(v: T | undefined): T {
    if (typeof v === "undefined") {
        throw new Error("assert failed");
    } else return v;
}
export function subscribe(database: Database, signal: AbortSignal) {
    const refname = "devlog";
    const items = ref(database, refname);
    const shared_list = query(items, orderByPriority());
    const replicated: Map<string, {
        task: string,

        
        priority: number,
        previous_sibling_id?: string,
        next_sibling_id?: string,
    }> = new Map();
    // const new_item = push(items);
    // setWithPriority(new_item, "Okay", 0.5);
    const unsubscribers = [
        onChildAdded(shared_list, function(snapshot, previous_sibling_id) {
            const priority = snapshot.priority;
            if (typeof priority !== "number") throw new Error("bad priority");
            if (snapshot.key === null) throw new Error("item without key");
            let next_sibling_id = undefined;
            if (typeof previous_sibling_id === "string") {
                const previous_sibling = replicated.get(previous_sibling_id);
                if (previous_sibling === undefined) throw new Error("invalid item reference received");
                next_sibling_id = previous_sibling.next_sibling_id
                previous_sibling.next_sibling_id = snapshot.key;
            }
            const item = {
                task: snapshot.val(),
                priority,
                previous_sibling_id: previous_sibling_id ?? undefined,
                next_sibling_id,
            };
            replicated.set(snapshot.key, item);
            const prev_priority = typeof previous_sibling_id === "string" ? assert(replicated.get(previous_sibling_id)).priority : 0;
            const next_priority = typeof next_sibling_id === "string" ? assert(replicated.get(next_sibling_id)).priority : 1;
            if (prev_priority === priority || next_priority === priority) {
                setPriority(ref(database, refname + "/" + snapshot.key), prev_priority + Math.random() * (next_priority - prev_priority));
            }
        }),
        onChildChanged(shared_list, function(snapshot) {
            console.log("::", snapshot, snapshot.val());
        }),
        onChildRemoved(shared_list, function(snapshot) {
            console.log("::", snapshot, snapshot.val());
        }),
        onChildMoved(shared_list, function(snapshot) {
            console.log("::", snapshot, snapshot.val());
        }),
        onValue(ref(database, "/.info/connected"), function(snapshot) {
            const is_connected = snapshot.val();
        }),
    ];
    signal.addEventListener("abort", function(e) {
        unsubscribers.forEach(unsubscribe => unsubscribe());
    })
}