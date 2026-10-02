import { serializeState, replaceState, saveState } from "./state.js";

// Table-level undo/redo via whole-state snapshots. The state is small
// (a few hundred KB at most), so snapshots are simpler and safer than diffs.
const LIMIT = 100;
const undoStack = [];
const redoStack = [];

/* Call right BEFORE a change, so the snapshot holds the old state. */
export function recordUndo() {
  undoStack.push(serializeState());
  if (undoStack.length > LIMIT) undoStack.shift();
  redoStack.length = 0;
}

function restore(from, to) {
  const snapshot = from.pop();
  if (snapshot === undefined) return false;
  to.push(serializeState());
  replaceState(JSON.parse(snapshot));
  saveState();
  return true;
}

export const undo = () => restore(undoStack, redoStack);
export const redo = () => restore(redoStack, undoStack);
