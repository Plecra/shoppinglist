type TaskId = string;
export type Task = {
    title: string;

    /** A number in the interval 1.0 indicating the task's sorting order. This is primarily used by firestore */
    priority: number;
};
/** The links in a doubly linked list. This enables us to interpret updates from the server */
type Link =  {
    next_id: TaskId;
    prev_id: TaskId;
};

export default class TaskList extends Map<TaskId, Task & Link> {
    insertAfter(data: Task, id: TaskId, prev_id: TaskId) {
        const prev = this.get(prev_id);
        if (prev === undefined) throw new ReferenceError("because `prev_id` refers to an unknown task, it isn't possible to insert a new task at it");
    }
}