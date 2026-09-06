export type CoursePhaseConfigurationRow = {
  course_id: string;
  phase_count: number;
};

export type CoursePhaseConfiguration = Record<string, number>;

export function phaseConfigurationByCourse(
  rows: CoursePhaseConfigurationRow[],
): CoursePhaseConfiguration {
  return Object.fromEntries(
    rows
      .filter(
        (row) =>
          typeof row.course_id === "string" &&
          Number.isInteger(row.phase_count) &&
          row.phase_count > 0,
      )
      .map((row) => [row.course_id, row.phase_count]),
  );
}

export function phaseOptions(phaseCount: number | undefined): number[] {
  return phaseCount ? Array.from({ length: phaseCount }, (_, index) => index + 1) : [];
}

export function initialPhaseNumber(
  phaseCount: number | undefined,
  existingPhase: number | null | undefined,
  editing: boolean,
): number | null {
  if (!phaseCount) return null;
  if (editing) return existingPhase ?? null;
  return 1;
}

export function phasePositionLabel(
  phaseCount: number | undefined,
  phaseNumber: number | null,
  position: number,
): string {
  if (!phaseCount) return `Position ${position}`;
  return `${phaseNumber ? `Phase ${phaseNumber}` : "Unassigned Phase"} • Position ${position}`;
}
