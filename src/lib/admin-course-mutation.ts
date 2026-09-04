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

export type AdminCourseUpdateArgs = ReturnType<typeof adminCourseMutationArgs> & {
  p_course_id: string;
};

export async function updateAdminCourseAndVerify(options: {
  courseId: string;
  values: AdminCourseFormValues;
  accessType: CourseAccessType;
  update: (args: AdminCourseUpdateArgs) => Promise<{ error: { message: string } | null }>;
  refetch: (courseId: string) => Promise<{
    data: { id: string; published: boolean; access_type: CourseAccessType } | null;
    error: unknown;
  }>;
}) {
  const args = {
    ...adminCourseMutationArgs(options.values, options.accessType),
    p_course_id: options.courseId,
  };
  const result = await options.update(args);
  if (result.error) return { ok: false as const, message: result.error.message, args };

  const verification = await options.refetch(options.courseId);
  if (
    verification.error ||
    !courseMutationPersisted(verification.data, {
      id: options.courseId,
      published: args.p_published,
      accessType: args.p_access_type,
    })
  ) {
    return {
      ok: false as const,
      message: "Course update was not confirmed. Your form is unchanged; please retry.",
      args,
    };
  }

  return { ok: true as const, course: verification.data, args };
}
