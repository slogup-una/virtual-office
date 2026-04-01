export interface SeatDefinition {
  key: string;
  label: string;
  x: number;
  y: number;
}

const mainDeskSeatCenters = [8.33, 19, 29.67, 40.33, 51, 61.67] as const;

const mainDeskRows = [
  { rowKey: "A", y: 32.8, seatCenters: mainDeskSeatCenters },
  { rowKey: "B", y: 38.8, seatCenters: mainDeskSeatCenters },
  { rowKey: "C", y: 51.8, seatCenters: mainDeskSeatCenters },
  { rowKey: "D", y: 57.8, seatCenters: mainDeskSeatCenters },
  { rowKey: "E", y: 70.8, seatCenters: mainDeskSeatCenters.slice(1) },
  { rowKey: "F", y: 76.8, seatCenters: mainDeskSeatCenters.slice(1) },
] as const;

function createMainDeskSeatDefinitions(): SeatDefinition[] {
  return mainDeskRows.flatMap((row) =>
    row.seatCenters.map((x, index) => ({
      key: `${row.rowKey}-${String(index + 1).padStart(2, "0")}`,
      label: `자리${index + 1}`,
      x,
      y: row.y,
    })),
  );
}

// Temporary seat assignment map.
// Edit the Slack user ID on the left and assign a seat key on the right.
// Replace `U_DEMO_1` with a real Slack user ID such as `U08ABC12345`.
export const seatAssignmentsBySlackUserId: Record<string, string> = {
  U07Q6TXGLS3: "A-01",
  U09HVUZEYF5: "A-06",
  U07FFFAP6QJ: "B-01",
  U099HL53CSH: "B-04",
  U0914RS1YJX: "B-05",
  U097C9FKX4Y: "B-06",
  U080MK7NWPK: "C-01",
  U09BYQWJF0R: "C-02",
  U0300SNM5R8: "C-03",
  U08L0KPFH8Q: "C-04",
  U03EXNZDYKB: "C-05",
  U08HTAX7XT2: "C-06",
  U0300RVPF9R: "D-01",
  U09F8QSJCC8: "D-02",
  U09UREZMBJS: "D-03",
  U048Q7QS2FQ: "D-04",
  U06A4SHGPU7: "D-05",
  U0AGJ4P3HBK: "D-06",
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
