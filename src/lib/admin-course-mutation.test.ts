import { describe, expect, it } from "vitest";
import { adminCourseMutationArgs, courseMutationPersisted } from "./admin-course-mutation";

const form = {
  title: "Free lesson",
  slug: "free",
  description: "Free course",
  price: 0,
  image: "",
  published: true,
};

describe("Admin course update payload", () => {
  it("sends checked Free publication state and classification", () => {
    expect(adminCourseMutationArgs(form, "free")).toMatchObject({
      p_published: true,
      p_access_type: "free",
    });
    expect(adminCourseMutationArgs({ ...form, published: false }, "free")).toMatchObject({
      p_published: false,
      p_access_type: "free",
    });
  });

  it("preserves Premium classification independently of price", () => {
    expect(adminCourseMutationArgs({ ...form, price: 0 }, "premium")).toMatchObject({
      p_price: 0,
      p_access_type: "premium",
    });
  });

  it("requires the authoritative row to match UUID, publication, and access type", () => {
    const expected = { id: "course-id", published: true, accessType: "free" as const };
    expect(
      courseMutationPersisted({ id: "course-id", published: true, access_type: "free" }, expected),
    ).toBe(true);
    expect(
      courseMutationPersisted({ id: "course-id", published: false, access_type: "free" }, expected),
    ).toBe(false);
    expect(
      courseMutationPersisted(
        { id: "different-id", published: true, access_type: "free" },
        expected,
      ),
    ).toBe(false);
  });
});
