type SubmitEvent = { preventDefault: () => void };
type SaveAction = () => unknown | Promise<unknown>;

export type EditableCourse = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  image: string | null;
  published: boolean;
  access_type: "free" | "premium";
};

export function courseEditForm(course: EditableCourse, area: "free" | "premium") {
  if (course.access_type !== area) return null;
  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description ?? "",
    price: String(course.price),
    image: course.image ?? "",
    published: course.published,
  };
}

export function runCourseSave(saveCourse: SaveAction, event?: SubmitEvent) {
  event?.preventDefault();
  return saveCourse();
}

export function runLessonSave(saveLesson: SaveAction, event?: SubmitEvent) {
  event?.preventDefault();
  return saveLesson();
}
