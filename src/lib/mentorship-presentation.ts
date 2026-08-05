export type CurriculumModule = {
  name: string;
  items: readonly string[];
};

/** The compact card deliberately exposes a small, complete curriculum sample. */
export function getCurriculumPreview(modules: readonly CurriculumModule[]) {
  return modules.slice(0, 2).map((module) => ({
    ...module,
    items: module.items.slice(0, 2),
  }));
}
