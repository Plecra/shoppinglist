import { unexpected, get_line, range_to_span, type CursorPosition, value_update } from "./util"

function dragitems(_: unknown) {
    let startX = 0, startY = 0;
    let dragging = -1;
    let dragstart = 0;
    function cancel_drag(list: HTMLOListElement) {
        if (dragging === -1) return;
        const li = list.childNodes[dragging];
        if (!(li instanceof HTMLLIElement)) unexpected("corrupted DOM");
        dragging = -1;
        li.style.transform = "";
    }
    return {
        touchstart(e: TouchEvent) {
            if (e.touches.length !== 1) return;
            const touch = e.touches[0];
            if (!(touch.target instanceof HTMLLIElement)) return;
            startX = touch.pageX;
            startY = touch.pageY;
            dragging = get_line(touch.target);
            dragstart = performance.now();
        },
        touchmove(this: HTMLOListElement, e: TouchEvent) {
            if (e.touches.length !== 1) cancel_drag(this);
            if (dragging === -1) return;
            const { pageX, pageY } = e.touches[0];
            const diffX = pageX - startX;
            const diffY = pageY - startY;
            if (performance.now() - dragstart > 150) {
                e.preventDefault();
                const li = this.childNodes[dragging];
                if (!(li instanceof HTMLLIElement)) unexpected("corrupted DOM");
                li.style.transform = `translate(${diffX}px,${diffY}px) scale(120%)`;
            } else if (diffX ** 2 + diffY ** 2 > Math.sqrt(12)) cancel_drag(this);
        },
        touchend(this: HTMLOListElement, e: unknown) {
            cancel_drag(this);
        },
    }
}
// Forcefully rebuilds the page. This is slow and will break any active cursor sessions
function rebuild_list(list: HTMLOListElement, items: string[]) {
    list.replaceChildren(...items.map(item => {
        const node = document.createElement("li");
        node.appendChild(item === "" ? document.createElement("br") : document.createTextNode(item));
        return node;
    }));
}
function inputhandling(items: string[]) {
    const text_class = "a-zA-Z0-9 '\\[\\]£#/!?,.";
    const is_text = new RegExp(`^[${text_class}]*$`);
    const is_text_or_newline = new RegExp(`^[${text_class}\\n]*$`);

    let pending_insertCompositionText = false;
    let previous_position = { from_line: 0, to_line: 0, from_column: 0, to_column: 0 };
    function handle_line_break(list: HTMLOListElement) {

        for (let i = previous_position.to_line - 1; i > previous_position.from_line; i--) delete_line(i);
        if (previous_position.from_line === previous_position.to_line) insert_line(previous_position.from_line + 1);
        mirror_line(list, previous_position.from_line);
        mirror_line(list, previous_position.from_line + 1);
    }

    function mirror_line(list: HTMLOListElement, line: number) {
        const old = items[line];
        items[line] = list.childNodes[line].textContent ?? "";
        value_update(["items", line], "modify", old);
    }
    function insert_line(line: number) {
        items.splice(line, 0, "");
        value_update(["items", line], "insert", null);
    }
    function delete_line(line: number) {
        value_update(["items", line], "delete", items.splice(line, 1)[0]);
    }
    function current_range(): Range {
        const sel = window.getSelection();
        if (sel === null || sel.rangeCount !== 1) throw new Error("Can't get current position without 1 range");
        return sel.getRangeAt(0);
    }
    function move_cursor(list: HTMLOListElement, { line, column }: CursorPosition) {
        const child = list.childNodes[line].childNodes[0];
        const range = document.createRange();
        if (child instanceof HTMLBRElement) {
            if (column !== 0) throw new Error("tried to move cursor to position that doesnt exist");
            range.selectNode(child);
        } else if (typeof child.nodeValue === "string") {
            if (column > child.nodeValue.length) throw new Error("tried to move cursor to position that doesnt exist");
            range.setStart(child, column);
            range.setEnd(child, column);
        } else unexpected("corrupted DOM");

        const sel = window.getSelection();
        if (sel === null) unexpected("selection always exists");
        sel.removeAllRanges();
        sel.addRange(range);
    }


    return {
        beforeinput(_: unknown) {
            previous_position = range_to_span(current_range());
        },
        input(this: HTMLOListElement, e: InputEvent) {
            switch (e.inputType) {
                case "deleteContentBackward":
                    for (let i = previous_position.to_line; i > previous_position.from_line; i--) delete_line(i);
                    mirror_line(this, previous_position.from_line); // to_line has been moved to here
                    return;
                case "insertParagraph": 
                    handle_line_break(this);
                    return;
                case "insertText":
                case "insertCompositionText":
                    if (typeof e.data === "string" && is_text.test(e.data)) {
                        mirror_line(this, previous_position.from_line);
                        return;
                    }
                    if (pending_insertCompositionText) {
                        pending_insertCompositionText = false;
                        return;
                    }
                    if (typeof e.data === "string" && is_text_or_newline.test(e.data)) {
                        pending_insertCompositionText = true;
                        handle_line_break(this)
                        return;
                    }
                    break;
                default: break;
            }
            console.warn("Unrecognized input event ignored", e);
            rebuild_list(this, items);
            move_cursor(this, { line: previous_position.to_line, column: Math.min(previous_position.to_column, items[previous_position.to_line].length) });
        }
    };
}
function build(items: string[]) {
    return {
        mount(this: HTMLOListElement, _: unknown) { rebuild_list(this, items) }
    };
}
type EventMap = HTMLElementEventMap & { input: InputEvent, mount: Event };
const builders: ((items: string[]) => ({ [K in keyof EventMap]?: (this: HTMLOListElement, event: EventMap[K]) => void }))[] = [build, inputhandling, dragitems];
export function installHandlers(list: HTMLOListElement, data: string[], signal: AbortSignal) {
    for (const component of builders)
        for (const [key, value] of Object.entries(component(data)))
            list.addEventListener(key, value as any, { signal })
}