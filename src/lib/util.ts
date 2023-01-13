/** in JS codepoints. I think they're UTF-16 code units */
export type StringIndex = number;
export type CursorPosition = {
  line: number,
  column: StringIndex, 
};
export function value_update(path: (string | number)[], type: "insert" | "modify" | "delete", old_value: any) {
}

export function unexpected(badstate: string): never {
    throw new Error(badstate);
  }
export type CursorSpan = { from_line: number, to_line: number, from_column: StringIndex, to_column: StringIndex };
export function get_line(el: Node): number {
    const li = get_li(el);
    return Array.prototype.indexOf.call(li.parentElement.childNodes, li);
}

function field_is_instance<K extends string, C extends abstract new (...args: any) => any>(
  object: any, field: K, cls: C):
  object is { [key in K]: InstanceType<C> } {
  return object && object[field] instanceof cls;
}
export function get_li(el: Node): HTMLLIElement & { parentElement: HTMLOListElement } {
  const li = el instanceof HTMLLIElement ? el
    : (el instanceof Text && el.parentElement instanceof HTMLLIElement) ? el.parentElement
    : null;
  if (field_is_instance(li, "parentElement", HTMLOListElement)) return li;
  unexpected("corrupted DOM");
}
export function range_to_span(range: Range): CursorSpan {
    return {
      from_line: get_line(range.startContainer),
      to_line: get_line(range.endContainer),
      from_column: range.startOffset,
      to_column: range.endOffset,
    };
  }