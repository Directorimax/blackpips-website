type SubmitEvent = { preventDefault: () => void };
type SaveAction = () => unknown | Promise<unknown>;

export function runCourseSave(saveCourse: SaveAction, event?: SubmitEvent) {
  event?.preventDefault();
  return saveCourse();
}

export function runLessonSave(saveLesson: SaveAction, event?: SubmitEvent) {
  event?.preventDefault();
  return saveLesson();
}
