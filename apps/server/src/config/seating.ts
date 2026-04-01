export interface SeatDefinition {
  key: string;
  label: string;
  x: number;
  y: number;
}

const mainDeskRows = [
  { rowKey: "A", y: 32.8 },
  { rowKey: "B", y: 38.8 },
  { rowKey: "C", y: 51.8 },
  { rowKey: "D", y: 57.8 },
  { rowKey: "E", y: 70.8 },
  { rowKey: "F", y: 76.8 }
] as const;

const mainDeskSeatCenters = [8.33, 19, 29.67, 40.33, 51, 61.67] as const;

function createMainDeskSeatDefinitions(): SeatDefinition[] {
  return mainDeskRows.flatMap((row) =>
    mainDeskSeatCenters.map((x, index) => ({
      key: `${row.rowKey}-${String(index + 1).padStart(2, "0")}`,
      label: `자리${index + 1}`,
      x,
      y: row.y
    }))
  );
}

// Temporary seat assignment map.
// Edit the Slack user ID on the left and assign a seat key on the right.
// Replace `U_DEMO_1` with a real Slack user ID such as `U08ABC12345`.
export const seatAssignmentsBySlackUserId: Record<string, string> = {
  U_DEMO_1: "F-04"
};

export const seatDefinitions: SeatDefinition[] = [
  ...createMainDeskSeatDefinitions(),
  { key: "R-01", label: "자리1", x: 82.25, y: 64.6 },
  { key: "R-02", label: "자리2", x: 92.75, y: 64.6 },
  { key: "S-01", label: "자리1", x: 82.25, y: 72.6 },
  { key: "S-02", label: "자리2", x: 92.75, y: 72.6 },
  { key: "T-01", label: "자리1", x: 82.25, y: 79.6 },
  { key: "T-02", label: "자리2", x: 92.75, y: 79.6 },
];

export const seatDefinitionByKey = Object.fromEntries(
  seatDefinitions.map((seat) => [seat.key, seat]),
);
