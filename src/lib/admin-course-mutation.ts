export type CourseAccessType = "free" | "premium";

export type AdminCourseFormValues = {
  title: string;
  slug: string;
  description: string;
  price: number;
  image: string;
  published: boolean;
};

export function adminCourseMutationArgs(
  values: AdminCourseFormValues,
  accessType: CourseAccessType,
) {
  return {
    p_title: values.title.trim(),
    p_slug: values.slug.trim(),
    p_description: values.description.trim() || null,
    p_price: values.price,
    p_image: values.image.trim() || null,
    p_published: values.published,
    p_access_type: accessType,
  } as const;
}

export function courseMutationPersisted(
  course: { id: string; published: boolean; access_type: CourseAccessType } | null,
  expected: { id: string; published: boolean; accessType: CourseAccessType },
) {
  return (
    course?.id === expected.id &&
    course.published === expected.published &&
    course.access_type === expected.accessType
  );
}
