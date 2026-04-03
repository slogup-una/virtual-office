export interface SeatDefinition {
  key: string;
  label: string;
  x: number;
  y: number;
}

const mainDeskSeatCenters = [19.07, 27.6, 36.13, 44.67, 53.2, 61.73] as const;

const mainDeskRows = [
  { rowKey: "A", y: 32.84, seatCenters: mainDeskSeatCenters },
  { rowKey: "B", y: 36.94, seatCenters: mainDeskSeatCenters.slice(1) },
  { rowKey: "C", y: 51.84, seatCenters: mainDeskSeatCenters },
  { rowKey: "D", y: 55.94, seatCenters: mainDeskSeatCenters },
  { rowKey: "E", y: 70.84, seatCenters: mainDeskSeatCenters.slice(1) },
  { rowKey: "F", y: 74.04, seatCenters: mainDeskSeatCenters.slice(1) },
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
  U04M47N64R2: "A-02",
  U094YK75WLF: "A-03",
  U05V185MM1Q: "A-04",
  U09HVUZEYF5: "A-06",
  U07FFFAP6QJ: "B-01",
  U06U5KMC6UV: "B-02",
  U099HL53CSH: "B-03",
  U0914RS1YJX: "B-04",
  U097C9FKX4Y: "B-05",
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
  U099H4WRW5U: "E-01",
  U096LL7N3HC: "E-02",
  U09F3NXHQ3X: "E-03",
  U07J0KS0CPR: "E-04",
  U09A6ERAQ8K: "E-05",
  U08L0KRHZ5E: "F-01",
  U0936D6GPRS: "F-02",
  U09FL29S89F: "F-03",
  U098H1ZTJSW: "F-04",
  U0APCLAHH8C: "F-05",
  U04QB45PCF4: "R-01",
  U09RR09V3S9: "R-02",
  U0AQZ2T9GG0: "S-01",
  U0875GX0Q78: "S-02",
  U07J9D2LVNU: "T-01",
  U0AENJJ19J9: "T-02",
};

export const seatDefinitions: SeatDefinition[] = [
  ...createMainDeskSeatDefinitions(),
  { key: "R-01", label: "자리1", x: 82.53, y: 64.03 },
  { key: "R-02", label: "자리2", x: 90.18, y: 64.03 },
  { key: "S-01", label: "자리1", x: 82.53, y: 72.03 },
  { key: "S-02", label: "자리2", x: 90.18, y: 72.03 },
  { key: "T-01", label: "자리1", x: 82.53, y: 79.03 },
  { key: "T-02", label: "자리2", x: 90.18, y: 79.03 },
];

export const seatDefinitionByKey = Object.fromEntries(
  seatDefinitions.map((seat) => [seat.key, seat]),
);
