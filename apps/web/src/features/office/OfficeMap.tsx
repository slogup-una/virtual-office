import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { ChangeEvent } from "react";

import { apiClient } from "../../api/client";
import type { OfficeSnapshot } from "../../types/domain";
import { useAssignSeat, useClearSeat } from "../../hooks/useOfficeData";
import { useUIStore } from "../../stores/uiStore";
import type { AvatarDirection } from "../../stores/uiStore";

const roomZones = [
  { id: "lounge", label: "휴게공간", x: 0, y: 0, width: 30, height: 22 },
  { id: "event-hall", label: "다목적 공간", x: 30, y: 0, width: 36, height: 22 },
  { id: "entrance", label: "출구", x: 66, y: 0, width: 10, height: 7 },
  { id: "storage", label: "창고", x: 77, y: 0, width: 17, height: 22 },
  { id: "meeting-room", label: "회의실 1", x: 77, y: 15, width: 17, height: 25 },
  { id: "qa-room", label: "QA ROOM", x: 77, y: 43.9, width: 17, height: 14.6 },
  { id: "meeting-a", label: "Seoul", x: 2, y: 86.7, width: 18, height: 10.3 },
  { id: "meeting-b", label: "Incheon", x: 20.5, y: 86.7, width: 18, height: 10.3 },
  { id: "meeting-c", label: "Jeju", x: 39, y: 86.7, width: 18, height: 10.3 },
  { id: "meeting-d", label: "Busan", x: 57.5, y: 86.7, width: 18, height: 10.3 },
  { id: "ceo-room", label: "CEO", x: 76, y: 87.5, width: 18, height: 9.5 },
  { id: "outdoor-space", label: "OUTDOOR", x: 94, y: 0, width: 6, height: 97 }
] as const;

const deskBands = [
  { rowKey: "A", x: 14.8, y: 30.6, seats: 6, columns: 6, emptyLeadingSlots: 0, width: 51.2, height: 4.48 },
  { rowKey: "B", x: 23.34, y: 34.7, seats: 5, columns: 5, emptyLeadingSlots: 0, width: 42.66, height: 4.48 },
  { rowKey: "C", x: 14.8, y: 49.6, seats: 6, columns: 6, emptyLeadingSlots: 0, width: 51.2, height: 4.48 },
  { rowKey: "D", x: 14.8, y: 53.7, seats: 6, columns: 6, emptyLeadingSlots: 0, width: 51.2, height: 4.48 },
  { rowKey: "E", x: 23.34, y: 68.6, seats: 5, columns: 5, emptyLeadingSlots: 0, width: 42.66, height: 4.48 },
  { rowKey: "F", x: 23.34, y: 71.8, seats: 5, columns: 5, emptyLeadingSlots: 0, width: 42.66, height: 4.48 }
] as const;

const sideDeskBands = [
  { rowKey: "R", y: 62, seats: 2 },
  { rowKey: "S", y: 70, seats: 2 },
  { rowKey: "T", y: 77, seats: 2 }
] as const;

const wallSegments = [
  { x: 0, y: 22, width: 66, height: 3.4, label: "WALL TYPE A", variant: "brick" },
  { x: 77, y: 40.5, width: 17, height: 3.4, label: "WALL TYPE B", variant: "glass" },
  { x: 77, y: 58.5, width: 17, height: 3.4, label: "WALL TYPE A", variant: "brick" }
] as const;

const decorativeWindows: Array<{ x: number; y: number; width: number; height: number }> = [];

type RoomObjectType =
  | "standard-desk"
  | "standing-desk"
  | "shared-bench"
  | "chair-standard"
  | "chair-mint"
  | "chair-pink"
  | "chair-executive"
  | "bean-bag"
  | "folding-chair"
  | "sofa-two-seat"
  | "lounge-sofa-table"
  | "meeting-table"
  | "round-coffee-table"
  | "whiteboard"
  | "wall-clock"
  | "sofa"
  | "coffee-table"
  | "l-desk"
  | "water-purifier"
  | "coffee-pot"
  | "plant-pot"
  | "bookshelf-pixel"
  | "whiteboard-pixel"
  | "meet-table"
  | "monitor-cyan"
  | "monitor-purple"
  | "monitor-pink"
  | "dual-monitor"
  | "laptop-open"
  | "tablet"
  | "printer"
  | "wall-monitor"
  | "succulent"
  | "monstera"
  | "cactus"
  | "hanging-plant"
  | "bonsai"
  | "mug"
  | "boba-tea"
  | "can-drink"
  | "bottle"
  | "snack-box"
  | "donut"
  | "notice-board"
  | "file-cabinet"
  | "trophy-shelf"
  | "bookshelf"
  | "box-stack"
  | "vending-machine"
  | "foosball-table"
  | "arcade-cabinet"
  | "floor-lamp"
  | "rug-set"
  | "reception-desk"
  | "security-gate"
  | "umbrella-stand"
  | "mailbox"
  | "server-rack"
  | "trolley-cart"
  | "meeting-room-sign"
  | "vacant-sign"
  | "in-meeting-sign"
  | "dnd-sign"
  | "neon-open-sign"
  | "floor-sign";

interface RoomObjectLibraryItem {
  type: RoomObjectType;
  label: string;
  width: number;
  height: number;
}

interface RoomObject {
  id: string;
  type: RoomObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  blocksMovement?: boolean;
}

const objectLibrary: RoomObjectLibraryItem[] = [
  { type: "standard-desk", label: "기본 책상", width: 9.8, height: 7.4 },
  { type: "standing-desk", label: "스탠딩 책상", width: 9.4, height: 8.3 },
  { type: "shared-bench", label: "공유 벤치", width: 15.8, height: 6.7 },
  { type: "chair-standard", label: "기본 의자", width: 4.6, height: 5.4 },
  { type: "chair-mint", label: "민트 의자", width: 4.6, height: 5.4 },
  { type: "chair-pink", label: "핑크 의자", width: 4.6, height: 5.4 },
  { type: "chair-executive", label: "CEO 의자", width: 5.2, height: 5.9 },
  { type: "bean-bag", label: "빈백 소파", width: 5.4, height: 5.4 },
  { type: "folding-chair", label: "접이 의자", width: 4.2, height: 4.9 },
  { type: "sofa-two-seat", label: "2인 소파", width: 13.2, height: 7.2 },
  { type: "lounge-sofa-table", label: "라운지 소파 세트", width: 18.5, height: 13.8 },
  { type: "meeting-table", label: "회의 테이블", width: 16.5, height: 14 },
  { type: "round-coffee-table", label: "원형 테이블", width: 7.4, height: 7.4 },
  { type: "whiteboard", label: "화이트보드", width: 5.8, height: 6.8 },
  { type: "wall-clock", label: "벽시계", width: 3.8, height: 5.2 },
  { type: "sofa", label: "3인 소파", width: 18, height: 7.5 },
  { type: "coffee-table", label: "커피 테이블", width: 7.6, height: 4.8 },
  { type: "l-desk", label: "L형 책상", width: 12.5, height: 8.5 },
  { type: "water-purifier", label: "정수기", width: 3.9, height: 8.7 },
  { type: "coffee-pot", label: "커피 포트", width: 6.8, height: 6.2 },
  { type: "plant-pot", label: "화분", width: 3.8, height: 7.6 },
  { type: "bookshelf-pixel", label: "책장 픽셀", width: 7.2, height: 8.9 },
  { type: "whiteboard-pixel", label: "화이트보드 픽셀", width: 6.2, height: 4.6 },
  { type: "meet-table", label: "미팅 테이블", width: 16.3, height: 10 },
  { type: "monitor-cyan", label: "민트 모니터", width: 6.2, height: 5.6 },
  { type: "monitor-purple", label: "퍼플 모니터", width: 6.2, height: 5.6 },
  { type: "monitor-pink", label: "핑크 모니터", width: 6.2, height: 5.6 },
  { type: "dual-monitor", label: "듀얼 모니터", width: 10.2, height: 6 },
  { type: "laptop-open", label: "노트북", width: 7.4, height: 5.7 },
  { type: "tablet", label: "태블릿", width: 4.8, height: 6.4 },
  { type: "printer", label: "프린터", width: 7.6, height: 5.3 },
  { type: "wall-monitor", label: "벽면 TV", width: 10.5, height: 6.2 },
  { type: "succulent", label: "다육이", width: 3.8, height: 4.9 },
  { type: "monstera", label: "몬스테라", width: 4.8, height: 6.6 },
  { type: "cactus", label: "선인장", width: 4, height: 6.6 },
  { type: "hanging-plant", label: "행잉 플랜트", width: 4.8, height: 6.6 },
  { type: "bonsai", label: "분재", width: 5.4, height: 5.8 },
  { type: "mug", label: "커피잔", width: 3.4, height: 4.1 },
  { type: "boba-tea", label: "버블티", width: 3, height: 4.8 },
  { type: "can-drink", label: "캔음료", width: 2.8, height: 4.3 },
  { type: "bottle", label: "물병", width: 2.6, height: 4.9 },
  { type: "snack-box", label: "스낵 박스", width: 4.2, height: 3.5 },
  { type: "donut", label: "도넛", width: 4.2, height: 3.3 },
  { type: "notice-board", label: "스티키 보드", width: 6.1, height: 6.1 },
  { type: "file-cabinet", label: "파일 캐비넷", width: 4.8, height: 7.6 },
  { type: "trophy-shelf", label: "트로피 선반", width: 4.8, height: 5.8 },
  { type: "bookshelf", label: "책장", width: 7.2, height: 8.6 },
  { type: "box-stack", label: "박스 더미", width: 5.6, height: 5.4 },
  { type: "vending-machine", label: "자판기", width: 4.8, height: 7.8 },
  { type: "foosball-table", label: "테이블 게임", width: 9.5, height: 6.2 },
  { type: "arcade-cabinet", label: "아케이드 게임", width: 4.8, height: 7.8 },
  { type: "floor-lamp", label: "플로어 램프", width: 3.4, height: 7.8 },
  { type: "rug-set", label: "러그 세트", width: 9.2, height: 6.2 },
  { type: "reception-desk", label: "안내 데스크", width: 11.5, height: 6.6 },
  { type: "security-gate", label: "보안 게이트", width: 7.6, height: 3.7 },
  { type: "umbrella-stand", label: "우산꽂이", width: 1.8, height: 3.1 },
  { type: "mailbox", label: "우편함", width: 5.6, height: 5.6 },
  { type: "server-rack", label: "서버 랙", width: 5.1, height: 7.8 },
  { type: "trolley-cart", label: "카트", width: 7.1, height: 6.4 },
  { type: "meeting-room-sign", label: "회의실 표지판", width: 7.6, height: 3.6 },
  { type: "vacant-sign", label: "공실 표시", width: 5.8, height: 3.6 },
  { type: "in-meeting-sign", label: "회의중 표시", width: 5.8, height: 3.6 },
  { type: "dnd-sign", label: "방해금지", width: 5.8, height: 3.6 },
  { type: "neon-open-sign", label: "오픈 네온사인", width: 6.8, height: 3.8 },
  { type: "floor-sign", label: "층 표지판", width: 4.1, height: 5.8 }
];

const objectLabelLookup = Object.fromEntries(objectLibrary.map((item) => [item.type, item.label])) as Record<
  RoomObjectType,
  string
>;

const defaultRoomObjects: RoomObject[] = [
  { id: "meeting-table-1", type: "meeting-table", x: 78.7, y: 23.4, width: 12.4, height: 11.6, blocksMovement: true },
  { id: "whiteboard-1", type: "whiteboard", x: 88.9, y: 16.7, width: 4.1, height: 5.3, blocksMovement: true },
  { id: "wall-clock-1", type: "wall-clock", x: 78.2, y: 16.4, width: 2.8, height: 4.1, blocksMovement: true },
  { id: "sofa-1", type: "sofa", x: 5.2, y: 7.5, width: 18, height: 7.5, blocksMovement: true },
  { id: "coffee-table-1", type: "coffee-table", x: 12.5, y: 13.6, width: 7.6, height: 4.8, blocksMovement: true },
  { id: "l-desk-1", type: "l-desk", x: 78.1, y: 89.1, width: 9.5, height: 7.2, blocksMovement: true },
  { id: "trophy-shelf-1", type: "trophy-shelf", x: 89.2, y: 88.6, width: 3.7, height: 4.6, blocksMovement: true },
  { id: "bookshelf-1", type: "bookshelf", x: 78.2, y: 4.8, width: 5.2, height: 7.5, blocksMovement: true },
  { id: "bookshelf-2", type: "bookshelf", x: 85.2, y: 4.8, width: 5.2, height: 7.5, blocksMovement: true },
  { id: "box-stack-1", type: "box-stack", x: 82.8, y: 8.8, width: 4.1, height: 4.1, blocksMovement: true },
  { id: "security-gate-1", type: "security-gate", x: 66.4, y: 3.2, width: 7.6, height: 3.7, blocksMovement: true },
  { id: "umbrella-stand-1", type: "umbrella-stand", x: 73.2, y: 3.45, width: 1.8, height: 3.1, blocksMovement: true }
];

const roomObjectStorageKey = "virtual-office-room-objects-v2";
const objectSnapStep = 0.5;
const motionGridStep = 2;
const motionObstaclePadding = 1.2;
const motionObjectHitboxInsetRatio = 0.18;
const motionObjectHitboxMinInset = 0.35;

const entrancePosition = {
  x: 71,
  y: 5
} as const;
const pinnedCeoSlackUserId = "U08EU38CJ64";
const demoPinnedCeoDisplayName = "Mina";
const pinnedCeoPosition = {
  x: 84.8,
  y: 90.5
} as const;
const meetingRoomSlots = [
  { zoneId: "meeting-a", x: 11, y: 90.5 },
  { zoneId: "meeting-b", x: 29.5, y: 90.5 },
  { zoneId: "meeting-c", x: 48, y: 90.5 },
  { zoneId: "meeting-d", x: 66.5, y: 90.5 }
] as const;
const fieldRoomPosition = {
  x: 84.8,
  y: 28
} as const;
const outdoorSlotPositions = [
  { x: 97, y: 11 },
  { x: 97, y: 19 },
  { x: 97, y: 27 },
  { x: 97, y: 35 },
  { x: 97, y: 43 },
  { x: 97, y: 51 },
  { x: 97, y: 59 },
  { x: 97, y: 67 },
  { x: 97, y: 75 },
  { x: 97, y: 83 }
] as const;
const officeNoticeEventName = "office-notice";

const motionStepDelayMs = 48;
const motionStepDistance = 1.1;
const corridorY = 10;

type SnapshotMember = OfficeSnapshot["members"][number];

interface MotionAvatar {
  id: string;
  member: SnapshotMember;
  x: number;
  y: number;
  opacity: number;
}

interface MotionPoint {
  x: number;
  y: number;
}

function isRoomObjectShape(value: unknown): value is RoomObject {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as RoomObject;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.x === "number" &&
    typeof candidate.y === "number" &&
    typeof candidate.width === "number" &&
    typeof candidate.height === "number" &&
    (typeof candidate.blocksMovement === "boolean" || typeof candidate.blocksMovement === "undefined")
  );
}

function isMovementBlockingObject(object: RoomObject) {
  return object.blocksMovement === true;
}

function getMotionObjectCollisionBounds(object: { x: number; y: number; width: number; height: number }) {
  const insetX = Math.max(object.width * motionObjectHitboxInsetRatio, motionObjectHitboxMinInset);
  const insetY = Math.max(object.height * motionObjectHitboxInsetRatio, motionObjectHitboxMinInset);

  return {
    left: object.x + insetX,
    right: object.x + object.width - insetX,
    top: object.y + insetY,
    bottom: object.y + object.height - insetY
  };
}

function hashValue(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getPinnedMemberPosition(member: SnapshotMember, isDemoWorkspace: boolean) {
  if (
    member.slackUserId === pinnedCeoSlackUserId &&
    member.isOnline &&
    member.officeStatus !== "away" &&
    member.officeStatus !== "offline"
  ) {
    return pinnedCeoPosition;
  }

  if (
    isDemoWorkspace &&
    member.displayName === demoPinnedCeoDisplayName &&
    member.isOnline &&
    member.officeStatus !== "away" &&
    member.officeStatus !== "offline"
  ) {
    return pinnedCeoPosition;
  }

  return null;
}

function getOutdoorPositionMap(members: SnapshotMember[]) {
  const eligibleMembers = members
    .filter(
      (member) =>
        !member.seatKey &&
        member.officeStatus !== "meeting" &&
        member.officeStatus !== "field" &&
        member.officeStatus !== "away" &&
        member.officeStatus !== "offline"
    )
    .sort((left, right) => left.slackUserId.localeCompare(right.slackUserId));

  return new Map(
    eligibleMembers.map((member, index) => [
      member.id,
      outdoorSlotPositions[index % outdoorSlotPositions.length]
    ])
  );
}

function getMeetingRoomPosition(member: SnapshotMember) {
  const roomIndex = hashValue(member.slackUserId || member.id) % meetingRoomSlots.length;
  const room = meetingRoomSlots[roomIndex];
  return {
    x: room.x,
    y: room.y
  };
}

function getPreferredMemberPosition(
  member: SnapshotMember,
  outdoorPositionMap: Map<string, { x: number; y: number }>,
  isDemoWorkspace: boolean
) {
  const pinnedPosition = getPinnedMemberPosition(member, isDemoWorkspace);
  if (pinnedPosition) {
    return pinnedPosition;
  }

  if (member.isOnline && member.officeStatus === "meeting") {
    return getMeetingRoomPosition(member);
  }

  if (member.isOnline && member.officeStatus === "field") {
    return fieldRoomPosition;
  }

  const outdoorPosition = outdoorPositionMap.get(member.id);
  if (member.isOnline && outdoorPosition) {
    return outdoorPosition;
  }

  return {
    x: member.x,
    y: member.y
  };
}

function getMotionRoute({
  startX,
  startY,
  endX,
  endY,
  roomObjects,
  wallSegments
}: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  roomObjects: RoomObject[];
  wallSegments: ReadonlyArray<{ x: number; y: number; width: number; height: number }>;
}) {
  const maxCell = Math.round(100 / motionGridStep);
  const toCell = (value: number) => clamp(Math.round(value / motionGridStep), 0, maxCell);
  const toCoord = (cell: number) => cell * motionGridStep;
  const toKey = (x: number, y: number) => `${x},${y}`;
  const obstacleObjects = roomObjects.filter(isMovementBlockingObject);

  const isBlocked = (x: number, y: number) =>
    obstacleObjects.some(
      (object) => {
        const bounds = getMotionObjectCollisionBounds(object);
        return (
          x >= bounds.left - motionObstaclePadding &&
          x <= bounds.right + motionObstaclePadding &&
          y >= bounds.top - motionObstaclePadding &&
          y <= bounds.bottom + motionObstaclePadding
        );
      }
    ) ||
    wallSegments.some(
      (wall) =>
        x >= wall.x - motionObstaclePadding &&
        x <= wall.x + wall.width + motionObstaclePadding &&
        y >= wall.y - motionObstaclePadding &&
        y <= wall.y + wall.height + motionObstaclePadding
    );

  const blocked = new Set<string>();
  for (let cellY = 0; cellY <= maxCell; cellY += 1) {
    for (let cellX = 0; cellX <= maxCell; cellX += 1) {
      if (isBlocked(toCoord(cellX), toCoord(cellY))) {
        blocked.add(toKey(cellX, cellY));
      }
    }
  }

  const startCell = { x: toCell(startX), y: toCell(startY) };
  const endCell = { x: toCell(endX), y: toCell(endY) };

  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      blocked.delete(toKey(clamp(startCell.x + offsetX, 0, maxCell), clamp(startCell.y + offsetY, 0, maxCell)));
      blocked.delete(toKey(clamp(endCell.x + offsetX, 0, maxCell), clamp(endCell.y + offsetY, 0, maxCell)));
    }
  }

  const open: Array<{ x: number; y: number }> = [startCell];
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>([[toKey(startCell.x, startCell.y), 0]]);
  const fScore = new Map<string, number>([
    [toKey(startCell.x, startCell.y), Math.abs(endCell.x - startCell.x) + Math.abs(endCell.y - startCell.y)]
  ]);

  while (open.length > 0) {
    open.sort((a, b) => (fScore.get(toKey(a.x, a.y)) ?? Number.POSITIVE_INFINITY) - (fScore.get(toKey(b.x, b.y)) ?? Number.POSITIVE_INFINITY));
    const current = open.shift();
    if (!current) {
      break;
    }

    if (current.x === endCell.x && current.y === endCell.y) {
      const pathCells: MotionPoint[] = [];
      let cursorKey = toKey(current.x, current.y);
      while (cursorKey) {
        const [cellX, cellY] = cursorKey.split(",").map(Number);
        pathCells.unshift({ x: toCoord(cellX), y: toCoord(cellY) });
        const previous = cameFrom.get(cursorKey);
        if (!previous) {
          break;
        }
        cursorKey = previous;
      }

      const compressed = pathCells.filter((point, index, list) => {
        if (index === 0 || index === list.length - 1) {
          return true;
        }
        const previous = list[index - 1];
        const next = list[index + 1];
        const previousDirection = { x: point.x - previous.x, y: point.y - previous.y };
        const nextDirection = { x: next.x - point.x, y: next.y - point.y };
        return previousDirection.x !== nextDirection.x || previousDirection.y !== nextDirection.y;
      });

      return [
        { x: startX, y: startY },
        ...compressed.slice(1, -1),
        { x: endX, y: endY }
      ];
    }

    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 }
    ].filter((neighbor) => neighbor.x >= 0 && neighbor.x <= maxCell && neighbor.y >= 0 && neighbor.y <= maxCell);

    neighbors.forEach((neighbor) => {
      const neighborKey = toKey(neighbor.x, neighbor.y);
      if (blocked.has(neighborKey)) {
        return;
      }

      const tentativeGScore = (gScore.get(toKey(current.x, current.y)) ?? Number.POSITIVE_INFINITY) + 1;
      if (tentativeGScore >= (gScore.get(neighborKey) ?? Number.POSITIVE_INFINITY)) {
        return;
      }

      cameFrom.set(neighborKey, toKey(current.x, current.y));
      gScore.set(neighborKey, tentativeGScore);
      fScore.set(neighborKey, tentativeGScore + Math.abs(endCell.x - neighbor.x) + Math.abs(endCell.y - neighbor.y));

      if (!open.some((node) => node.x === neighbor.x && node.y === neighbor.y)) {
        open.push(neighbor);
      }
    });
  }

  return [
    { x: startX, y: startY },
    { x: startX, y: corridorY },
    { x: endX, y: corridorY },
    { x: endX, y: endY }
  ];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function snap(value: number) {
  return Math.round(value / objectSnapStep) * objectSnapStep;
}

function renderAvatar(
  member: SnapshotMember,
  override?: {
    x?: number;
    y?: number;
    opacity?: number;
    isTransitioning?: boolean;
    isCurrent?: boolean;
    direction?: AvatarDirection;
    isMoving?: boolean;
    isSeated?: boolean;
  }
) {
  return (
    <div
      key={member.id}
      className={`avatar-token ${member.officeStatus} ${override?.isCurrent ? "is-current" : ""} ${override?.isTransitioning ? "is-transitioning" : ""} direction-${override?.direction ?? "down"} ${override?.isMoving ? "is-moving" : ""} ${override?.isSeated ? "is-seated" : ""}`}
      style={{
        left: `${override?.x ?? member.x}%`,
        top: `${override?.y ?? member.y}%`,
        opacity: override?.opacity ?? 1
      }}
      title={`${member.displayName} · ${member.slackStatusText ?? member.officeStatus}`}
    >
      {override?.isCurrent ? <em className="you-badge">YOU</em> : null}
      {override?.isSeated ? (
        <div className="avatar-seated-sprite">
          <div className="avatar-seated-head">
            <img alt={member.displayName} src={member.avatarUrl} />
          </div>
          <span className="avatar-seated-back" />
          <span className="avatar-seated-body" />
          <span className="avatar-seated-seat" />
          <span className="avatar-seated-post" />
          <span className="avatar-seated-base" />
        </div>
      ) : (
        <div className="avatar-chibi">
          <div className="avatar-head-shell">
            <img alt={member.displayName} src={member.avatarUrl} />
          </div>
          <div className="avatar-body-shell">
            <span className="avatar-chair-back" />
            <span className="avatar-arm avatar-arm-left" />
            <span className="avatar-arm avatar-arm-right" />
            <span className="avatar-torso" />
            <span className="avatar-leg avatar-leg-left" />
            <span className="avatar-leg avatar-leg-right" />
            <span className="avatar-seat" />
          </div>
        </div>
      )}
      <span>{member.displayName}</span>
    </div>
  );
}

export function OfficeMap({ snapshot }: { snapshot: OfficeSnapshot }) {
  const selectedZoneId = useUIStore((state) => state.selectedZoneId);
  const setSelectedZoneId = useUIStore((state) => state.setSelectedZoneId);
  const assignSeat = useAssignSeat();
  const clearSeat = useClearSeat();
  const layoutEditorOffset = useUIStore((state) => state.layoutEditorOffset);
  const isLayoutEditorPanelOpen = useUIStore((state) => state.isLayoutEditorPanelOpen);
  const demoMotionOffset = useUIStore((state) => state.demoMotionOffset);
  const seatAssignmentOffset = useUIStore((state) => state.seatAssignmentOffset);
  const isDemoMotionOpen = useUIStore((state) => state.isDemoMotionOpen);
  const setLayoutEditorOffset = useUIStore((state) => state.setLayoutEditorOffset);
  const setIsLayoutEditorPanelOpen = useUIStore((state) => state.setIsLayoutEditorPanelOpen);
  const setDemoMotionOffset = useUIStore((state) => state.setDemoMotionOffset);
  const setSeatAssignmentOffset = useUIStore((state) => state.setSeatAssignmentOffset);
  const setIsDemoMotionOpen = useUIStore((state) => state.setIsDemoMotionOpen);
  const currentUserDirection = useUIStore((state) => state.currentUserDirection);
  const isCurrentUserMoving = useUIStore((state) => state.isCurrentUserMoving);
  const isCurrentUserSeated = useUIStore((state) => state.isCurrentUserSeated);
  const [selectedSeatKey, setSelectedSeatKey] = useState<string | null>(null);
  const [seatSearch, setSeatSearch] = useState("");
  const [motionAvatars, setMotionAvatars] = useState<MotionAvatar[]>([]);
  const [roomObjects, setRoomObjects] = useState<RoomObject[]>(() => [...defaultRoomObjects]);
  const [isLayoutEditMode, setIsLayoutEditMode] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [draggingObjectId, setDraggingObjectId] = useState<string | null>(null);
  const previousMembersRef = useRef<Map<string, SnapshotMember>>(new Map());
  const timeoutIdsRef = useRef<Map<string, number>>(new Map());
  const layoutPanelDragRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const demoPanelDragRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const seatPanelDragRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const dragObjectIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const mapSurfaceRef = useRef<HTMLDivElement | null>(null);
  const objectBackupInputRef = useRef<HTMLInputElement | null>(null);
  const currentUser = snapshot.members.find((member) => member.id === snapshot.currentUserId) ?? null;
  const isDemoWorkspace = snapshot.workspace.id === "demo-workspace";

  const selectedSeat = snapshot.seats.find((seat) => seat.key === selectedSeatKey) ?? null;
  const selectedSeatMember = selectedSeat?.assignedSlackUserId
    ? snapshot.members.find((member) => member.slackUserId === selectedSeat.assignedSlackUserId) ?? null
    : null;
  const canManageSeats = snapshot.canManageSeats;
  const canEditLayout = canManageSeats;
  const normalizedSeatSearch = seatSearch.trim().toLowerCase();
  const transitioningMemberIds = new Set(motionAvatars.map((member) => member.id));
  const outdoorPositionMap = getOutdoorPositionMap(snapshot.members);
  const filteredMembers = snapshot.members.filter((member) => {
    if (!normalizedSeatSearch) {
      return true;
    }

    return (
      member.displayName.toLowerCase().includes(normalizedSeatSearch) ||
      member.slackUserId.toLowerCase().includes(normalizedSeatSearch)
    );
  });
  const handleSeatClick = (seatKey: string) => {
    if (!canManageSeats) {
      return;
    }

    console.log("[seat-click]", {
      seatKey,
      seat: snapshot.seats.find((seat) => seat.key === seatKey) ?? null
    });
    setSelectedSeatKey(seatKey);
    setSeatSearch("");
  };
  const handleSeatBackupDownload = async () => {
    const content = await apiClient.exportSeatAssignments();
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "seat-assignments.ts";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const raw = window.localStorage.getItem(roomObjectStorageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as RoomObject[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setRoomObjects(parsed);
      }
    } catch {
      window.localStorage.removeItem(roomObjectStorageKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(roomObjectStorageKey, JSON.stringify(roomObjects));
  }, [roomObjects]);

  const runMotion = ({
    member,
    startX,
    startY,
    endX,
    endY,
    motionStatus
  }: {
    member: SnapshotMember;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    motionStatus: SnapshotMember["officeStatus"];
  }) => {
    const clearExistingMotion = () => {
      const existingTimeoutId = timeoutIdsRef.current.get(member.id);
      if (existingTimeoutId) {
        window.clearTimeout(existingTimeoutId);
      }
    };

    clearExistingMotion();

    const routePoints = getMotionRoute({
      startX,
      startY,
      endX,
      endY,
      roomObjects,
      wallSegments
    });

    const totalDistance = routePoints.slice(1).reduce((distance, point, index) => {
      const previousPoint = routePoints[index];
      return distance + Math.abs(point.x - previousPoint.x) + Math.abs(point.y - previousPoint.y);
    }, 0);

    setMotionAvatars((current) => [
      ...current.filter((item) => item.id !== member.id),
      {
        id: member.id,
        member: {
          ...member,
          officeStatus: motionStatus
        },
        x: startX,
        y: startY,
        opacity: 1
      }
    ]);

    let travelledDistance = 0;
    let segmentIndex = 0;
    let currentX = startX;
    let currentY = startY;

    const stepMotion = () => {
      const nextPoint = routePoints[segmentIndex + 1];
      if (!nextPoint) {
        setMotionAvatars((current) => current.filter((item) => item.id !== member.id));
        timeoutIdsRef.current.delete(member.id);
        return;
      }

      const deltaX = nextPoint.x - currentX;
      const deltaY = nextPoint.y - currentY;

      if (Math.abs(deltaX) <= motionStepDistance && Math.abs(deltaY) <= motionStepDistance) {
        travelledDistance += Math.abs(deltaX) + Math.abs(deltaY);
        currentX = nextPoint.x;
        currentY = nextPoint.y;
        segmentIndex += 1;
      } else if (Math.abs(deltaX) > 0) {
        const stepX = Math.sign(deltaX) * Math.min(Math.abs(deltaX), motionStepDistance);
        currentX += stepX;
        travelledDistance += Math.abs(stepX);
      } else if (Math.abs(deltaY) > 0) {
        const stepY = Math.sign(deltaY) * Math.min(Math.abs(deltaY), motionStepDistance);
        currentY += stepY;
        travelledDistance += Math.abs(stepY);
      }

      setMotionAvatars((current) =>
        current.map((item) =>
          item.id === member.id
            ? {
                ...item,
                x: currentX,
                y: currentY,
                opacity: 1
              }
            : item
        )
      );

      const timeoutId = window.setTimeout(stepMotion, motionStepDelayMs);
      timeoutIdsRef.current.set(member.id, timeoutId);
    };

    const timeoutId = window.setTimeout(stepMotion, motionStepDelayMs);
    timeoutIdsRef.current.set(member.id, timeoutId);
  };

  const triggerDepartureMotion = (member: SnapshotMember) => {
    const preferredPosition = getPreferredMemberPosition(member, outdoorPositionMap, isDemoWorkspace);
    runMotion({
      member,
      startX: preferredPosition.x,
      startY: preferredPosition.y,
      endX: entrancePosition.x,
      endY: entrancePosition.y,
      motionStatus: "away"
    });
  };

  const triggerArrivalMotion = (member: SnapshotMember) => {
    const preferredPosition = getPreferredMemberPosition(member, outdoorPositionMap, isDemoWorkspace);
    runMotion({
      member,
      startX: entrancePosition.x,
      startY: entrancePosition.y,
      endX: preferredPosition.x,
      endY: preferredPosition.y,
      motionStatus: member.officeStatus
    });
  };

  const triggerRelocationMotion = (member: SnapshotMember, startPoint: MotionPoint, endPoint: MotionPoint) => {
    runMotion({
      member,
      startX: startPoint.x,
      startY: startPoint.y,
      endX: endPoint.x,
      endY: endPoint.y,
      motionStatus: member.officeStatus
    });
  };

  const triggerDemoNotice = (message: string) => {
    window.dispatchEvent(
      new CustomEvent(officeNoticeEventName, {
        detail: {
          message
        }
      })
    );
  };

  useEffect(() => {
    const previousMembers = previousMembersRef.current;
    const nextMembers = new Map(snapshot.members.map((member) => [member.id, member]));
    const previousOutdoorPositionMap = getOutdoorPositionMap([...previousMembers.values()]);

    snapshot.members.forEach((member) => {
      const previousMember = previousMembers.get(member.id);
      if (!previousMember) {
        return;
      }

      const wasUnavailable =
        previousMember.officeStatus === "away" || previousMember.officeStatus === "offline";
      const isUnavailable = member.officeStatus === "away" || member.officeStatus === "offline";
      const previousPosition = getPreferredMemberPosition(previousMember, previousOutdoorPositionMap, isDemoWorkspace);
      const nextPosition = getPreferredMemberPosition(member, outdoorPositionMap, isDemoWorkspace);

      if (!wasUnavailable && isUnavailable) {
        triggerDepartureMotion(previousMember);
        return;
      }

      if (wasUnavailable && !isUnavailable) {
        triggerArrivalMotion(member);
        return;
      }

      if (
        !wasUnavailable &&
        !isUnavailable &&
        (Math.abs(previousPosition.x - nextPosition.x) > 0.1 || Math.abs(previousPosition.y - nextPosition.y) > 0.1)
      ) {
        triggerRelocationMotion(member, previousPosition, nextPosition);
      }
    });

    previousMembersRef.current = nextMembers;
  }, [outdoorPositionMap, snapshot.members]);

  useEffect(
    () => () => {
      timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIdsRef.current.clear();
    },
    []
  );

  useEffect(() => {
    if (!isLayoutEditMode) {
      dragObjectIdRef.current = null;
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const objectId = dragObjectIdRef.current;
      const mapSurface = mapSurfaceRef.current;
      if (!objectId || !mapSurface) {
        return;
      }

      const rect = mapSurface.getBoundingClientRect();
      const nextX = ((event.clientX - rect.left) / rect.width) * 100 - dragOffsetRef.current.x;
      const nextY = ((event.clientY - rect.top) / rect.height) * 100 - dragOffsetRef.current.y;

      setRoomObjects((current) =>
        current.map((object) =>
          object.id === objectId
            ? {
                ...object,
                x: snap(clamp(nextX, 0, 100 - object.width)),
                y: snap(clamp(nextY, 0, 100 - object.height))
              }
            : object
        )
      );
    };

    const handlePointerUp = () => {
      dragObjectIdRef.current = null;
      setDraggingObjectId(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isLayoutEditMode]);

  const startObjectDrag = (event: React.PointerEvent<HTMLButtonElement>, object: RoomObject) => {
    if (!isLayoutEditMode || !mapSurfaceRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const rect = mapSurfaceRef.current.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * 100;
    const pointerY = ((event.clientY - rect.top) / rect.height) * 100;
    dragObjectIdRef.current = object.id;
    dragOffsetRef.current = {
      x: pointerX - object.x,
      y: pointerY - object.y
    };
    setSelectedObjectId(object.id);
    setDraggingObjectId(object.id);
  };

  const addRoomObject = (type: (typeof objectLibrary)[number]["type"]) => {
    const template = objectLibrary.find((item) => item.type === type);
    if (!template) {
      return;
    }

    const id = `${type}-${Date.now()}`;
    setRoomObjects((current) => [
      ...current,
      {
        id,
        type,
        x: 32,
        y: 20,
        width: template.width,
        height: template.height,
        blocksMovement: false
      }
    ]);
    setSelectedObjectId(id);
    setIsLayoutEditMode(true);
  };

  const removeSelectedObject = () => {
    if (!selectedObjectId) {
      return;
    }

    setRoomObjects((current) => current.filter((object) => object.id !== selectedObjectId));
    setSelectedObjectId(null);
  };

  const resetRoomObjects = () => {
    setRoomObjects([...defaultRoomObjects]);
    setSelectedObjectId(null);
    window.localStorage.removeItem(roomObjectStorageKey);
  };

  const handleObjectBackupDownload = () => {
    const content = JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        objects: roomObjects
      },
      null,
      2
    );
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "room-object-layout.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleObjectBackupImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const parsed = JSON.parse(content) as { objects?: unknown };
      const importedObjects = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.objects)
          ? parsed.objects
          : null;

      if (!importedObjects) {
        throw new Error("invalid format");
      }

      const nextObjects = importedObjects.filter(isRoomObjectShape);

      if (nextObjects.length === 0) {
        throw new Error("empty layout");
      }

      setRoomObjects(nextObjects);
      setSelectedObjectId(null);
      setIsLayoutEditMode(true);
    } catch {
      window.alert("오브젝트 백업 파일을 읽지 못했습니다.");
    } finally {
      event.target.value = "";
    }
  };

  const startFloatingPanelDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    type: "layout" | "demo" | "seat"
  ) => {
    const dragRef =
      type === "layout" ? layoutPanelDragRef : type === "demo" ? demoPanelDragRef : seatPanelDragRef;
    const setter =
      type === "layout"
        ? setLayoutEditorOffset
        : type === "demo"
          ? setDemoMotionOffset
          : setSeatAssignmentOffset;

    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId
    };

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      if (!dragRef.current || moveEvent.pointerId !== dragRef.current.pointerId) {
        return;
      }

      const deltaX = moveEvent.clientX - dragRef.current.x;
      const deltaY = moveEvent.clientY - dragRef.current.y;
      dragRef.current = {
        x: moveEvent.clientX,
        y: moveEvent.clientY,
        pointerId: moveEvent.pointerId
      };

      const currentOffset =
        type === "layout"
          ? useUIStore.getState().layoutEditorOffset
          : type === "demo"
            ? useUIStore.getState().demoMotionOffset
            : useUIStore.getState().seatAssignmentOffset;

      setter({
        x: currentOffset.x + deltaX,
        y: currentOffset.y + deltaY
      });
    };

    const handlePointerUp = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <section className="office-scene">
      <div
        className={`map-surface ${isLayoutEditMode ? "is-layout-editing" : ""}`}
        onClick={() => {
          if (isLayoutEditMode) {
            setSelectedObjectId(null);
          }
        }}
        ref={mapSurfaceRef}
      >
        <div className="map-grid" />
        <div className={`map-decor-layer ${isLayoutEditMode ? "is-editing" : ""}`}>
          {decorativeWindows.map((windowRect, index) => (
            <div
              className="pixel-window"
              key={index}
              style={{
                left: `${windowRect.x}%`,
                top: `${windowRect.y}%`,
                width: `${windowRect.width}%`,
                height: `${windowRect.height}%`
              }}
            />
          ))}
          {roomObjects.map((object) => (
            <button
              className={`map-object object-${object.type} ${isLayoutEditMode ? "is-editing" : ""} ${selectedObjectId === object.id ? "is-selected" : ""} ${draggingObjectId === object.id ? "is-dragging" : ""}`}
              key={object.id}
              onClick={(event) => {
                if (!isLayoutEditMode) {
                  return;
                }
                event.stopPropagation();
                setSelectedObjectId(object.id);
              }}
              onPointerDown={(event) => startObjectDrag(event, object)}
              style={{
                left: `${object.x}%`,
                top: `${object.y}%`,
                width: `${object.width}%`,
                height: `${object.height}%`
              }}
              title={objectLabelLookup[object.type]}
              type="button"
            >
              {draggingObjectId === object.id ? <span className="map-object-label">{objectLabelLookup[object.type]}</span> : null}
            </button>
          ))}
          {roomZones.map((zone) => (
            <button
              key={zone.id}
              className={`zone-card zone-room zone-${zone.id} ${selectedZoneId === zone.id ? "is-selected" : ""}`}
              onClick={() => setSelectedZoneId(zone.id)}
              style={{
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${zone.width}%`,
                height: `${zone.height}%`
              }}
              type="button"
            >
              <strong>{zone.label}</strong>
            </button>
          ))}
          {wallSegments.map((wall) => (
            <div
              className={`wall-segment wall-${wall.variant}`}
              key={`${wall.x}-${wall.y}`}
              style={{
                left: `${wall.x}%`,
                top: `${wall.y}%`,
                width: `${wall.width}%`,
                height: `${wall.height}%`
              }}
            >
              <span>{wall.label}</span>
            </div>
          ))}
        </div>
        <div className={`map-seat-layer ${isLayoutEditMode ? "is-editing" : ""}`}>
          {deskBands.map((band) => (
            <div
              className={`desk-row desk-row-main desk-row-${band.rowKey.toLowerCase()}`}
              key={band.rowKey}
              style={{
                left: `${band.x}%`,
                top: `${band.y}%`,
                width: `${band.width}%`,
                height: `${band.height}%`,
                gridTemplateColumns: `repeat(${band.columns}, 1fr)`
              }}
            >
              {Array.from({ length: band.emptyLeadingSlots }).map((_, index) => (
                <div aria-hidden="true" className="seat-spacer" key={`spacer-${band.rowKey}-${index}`} />
              ))}
              {Array.from({ length: band.seats }).map((_, index) => {
                const seatKey = `${band.rowKey}-${String(index + 1).padStart(2, "0")}`;
                const isAssigned = Boolean(snapshot.seats.find((seat) => seat.key === seatKey)?.assignedSlackUserId);
                return (
                  <button
                    className={`seat-chip ${isAssigned ? "is-assigned" : ""}`}
                    disabled={!canManageSeats}
                    key={seatKey}
                    onClick={() => handleSeatClick(seatKey)}
                    type="button"
                  >
                    <span className="seat-chip-meta">
                      <strong>{seatKey}</strong>
                      <small>{`자리${index + 1}`}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
          {sideDeskBands.map((band) => (
            <div
              className={`desk-row desk-row-side desk-row-${band.rowKey.toLowerCase()}`}
              key={band.rowKey}
              style={{ left: "78.7%", top: `${band.y}%`, width: "15.3%", height: "4.05%" }}
            >
              {Array.from({ length: band.seats }).map((_, index) => {
                const seatKey = `${band.rowKey}-${String(index + 1).padStart(2, "0")}`;
                const isAssigned = Boolean(snapshot.seats.find((seat) => seat.key === seatKey)?.assignedSlackUserId);
                return (
                  <button
                    className={`seat-chip ${isAssigned ? "is-assigned" : ""}`}
                    disabled={!canManageSeats}
                    key={seatKey}
                    onClick={() => handleSeatClick(seatKey)}
                    type="button"
                  >
                    <span className="seat-chip-meta">
                      <strong>{seatKey}</strong>
                      <small>{`자리${index + 1}`}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className={`map-avatar-layer ${isLayoutEditMode ? "is-editing" : ""}`}>
          {snapshot.members
            .filter((member) => member.officeStatus !== "away" && !transitioningMemberIds.has(member.id))
            .map((member) => {
              const preferredPosition = getPreferredMemberPosition(member, outdoorPositionMap, isDemoWorkspace);
              return renderAvatar(member, {
                x: preferredPosition.x,
                y: preferredPosition.y,
                isCurrent: member.id === snapshot.currentUserId,
                direction: member.id === snapshot.currentUserId ? currentUserDirection : "down",
                isMoving: member.id === snapshot.currentUserId ? isCurrentUserMoving : false,
                isSeated: member.id === snapshot.currentUserId ? isCurrentUserSeated : false
              });
            })}
          {motionAvatars.map((member) =>
            renderAvatar(member.member, {
              x: member.x,
              y: member.y,
              opacity: member.opacity,
              isTransitioning: true,
              isCurrent: member.member.id === snapshot.currentUserId,
              direction: member.member.id === snapshot.currentUserId ? currentUserDirection : "down",
              isMoving: true,
              isSeated: false
            })
          )}
        </div>
        {isDemoWorkspace && currentUser && isDemoMotionOpen ? (
          <aside className="demo-motion-panel" style={{ transform: `translate(${demoMotionOffset.x}px, ${demoMotionOffset.y}px)` }}>
            <div className="floating-header draggable-header" onPointerDown={(event) => startFloatingPanelDrag(event, "demo")}>
              <div>
                <span className="eyebrow panel-pixel-badge">Demo Motion</span>
                <h2>{currentUser.displayName}</h2>
              </div>
              <div className="panel-tools">
                <button
                  aria-label="데모 모션 패널 닫기"
                  className="panel-icon-button panel-close-button"
                  onClick={() => setIsDemoMotionOpen(false)}
                  type="button"
                >
                  <span aria-hidden="true" className="close-glyph">
                    ×
                  </span>
                </button>
              </div>
            </div>
            <div className="demo-motion-actions">
              <button
                className="ghost-button"
                onClick={() => {
                  triggerDepartureMotion(currentUser);
                  triggerDemoNotice(`${currentUser.displayName}님 고생하셨습니다.`);
                }}
                type="button"
              >
                퇴장 테스트
              </button>
              <button
                className="ghost-button"
                onClick={() => {
                  triggerArrivalMotion(currentUser);
                  triggerDemoNotice(`${currentUser.displayName}님 좋은 아침입니다.`);
                }}
                type="button"
              >
                입장 테스트
              </button>
            </div>
          </aside>
        ) : null}
        {isDemoWorkspace && currentUser && !isDemoMotionOpen ? (
          <button className="demo-motion-open-button" onClick={() => setIsDemoMotionOpen(true)} type="button">
            Demo Motion 열기
          </button>
        ) : null}
        {canEditLayout && isLayoutEditorPanelOpen ? (
          <aside className="layout-editor-panel" style={{ transform: `translate(${layoutEditorOffset.x}px, ${layoutEditorOffset.y}px)` }}>
            <div className="floating-header draggable-header" onPointerDown={(event) => startFloatingPanelDrag(event, "layout")}>
              <div>
                <span className="eyebrow panel-pixel-badge">Object Library</span>
                <h2>오브젝트 편집</h2>
              </div>
              <div className="panel-tools">
                <button
                  className={`panel-icon-button layout-toggle-button ${isLayoutEditMode ? "is-active" : ""}`}
                  onClick={() => setIsLayoutEditMode((current) => !current)}
                  type="button"
                >
                  {isLayoutEditMode ? "편집중" : "편집"}
                </button>
                <button
                  aria-label="오브젝트 편집 패널 닫기"
                  className="panel-icon-button panel-close-button"
                  onClick={() => setIsLayoutEditorPanelOpen(false)}
                  type="button"
                >
                  <span aria-hidden="true" className="close-glyph">
                    ×
                  </span>
                </button>
              </div>
            </div>
            <p className="seat-assignment-copy">
              오브젝트를 직접 드래그해 배치할 수 있습니다. 위치는 현재 브라우저에 저장됩니다.
            </p>
            <div className="object-library-grid">
              {objectLibrary.map((item) => (
                <button className="object-library-chip" key={item.type} onClick={() => addRoomObject(item.type)} type="button">
                  <strong>{item.label}</strong>
                  <small>{item.type}</small>
                </button>
              ))}
            </div>
            <div className="seat-assignment-actions">
              <button className="ghost-button" onClick={handleObjectBackupDownload} type="button">
                백업 다운로드
              </button>
              <button
                className="ghost-button"
                onClick={() => objectBackupInputRef.current?.click()}
                type="button"
              >
                백업 불러오기
              </button>
              <button className="ghost-button is-danger" disabled={!selectedObjectId} onClick={removeSelectedObject} type="button">
                선택 오브젝트 삭제
              </button>
              <button className="ghost-button" onClick={resetRoomObjects} type="button">
                기본 배치 복원
              </button>
            </div>
            <input
              accept="application/json,.json"
              className="sr-only"
              onChange={handleObjectBackupImport}
              ref={objectBackupInputRef}
              type="file"
            />
          </aside>
        ) : null}
        {selectedSeat && canManageSeats ? (
          <aside className="seat-assignment-panel" style={{ transform: `translate(${seatAssignmentOffset.x}px, ${seatAssignmentOffset.y}px)` }}>
            <div className="floating-header draggable-header" onPointerDown={(event) => startFloatingPanelDrag(event, "seat")}>
              <div>
                <span className="eyebrow panel-pixel-badge">Seat Manager</span>
                <h2>{selectedSeat.key}</h2>
              </div>
              <button
                aria-label="좌석 관리자 닫기"
                className="panel-icon-button panel-close-button"
                onClick={() => setSelectedSeatKey(null)}
                type="button"
              >
                <span aria-hidden="true" className="close-glyph">
                  ×
                </span>
              </button>
            </div>
            <p className="seat-assignment-copy">
              현재 배정: {selectedSeatMember ? `${selectedSeatMember.displayName} (${selectedSeatMember.slackUserId})` : "없음"}
            </p>
            <label className="seat-search-field">
              <span>유저 검색</span>
              <input
                onChange={(event) => setSeatSearch(event.target.value)}
                placeholder="닉네임 또는 Slack ID"
                type="text"
                value={seatSearch}
              />
            </label>
            <div className="seat-member-list">
              {filteredMembers.map((member) => (
                <button
                  className={`seat-member-option ${selectedSeat.assignedSlackUserId === member.slackUserId ? "is-selected" : ""}`}
                  key={member.id}
                  onClick={() =>
                    void assignSeat.mutateAsync({ seatKey: selectedSeat.key, slackUserId: member.slackUserId })
                  }
                  type="button"
                >
                  <strong>{member.displayName}</strong>
                  <small>{member.slackUserId}</small>
                </button>
              ))}
              {filteredMembers.length === 0 ? <p className="seat-empty-state">검색 결과가 없습니다.</p> : null}
            </div>
            <div className="seat-assignment-actions">
              <button className="ghost-button" onClick={() => void handleSeatBackupDownload()} type="button">
                백업 다운로드
              </button>
              <button
                className="ghost-button"
                disabled={!selectedSeat.assignedSlackUserId}
                onClick={() => void clearSeat.mutateAsync(selectedSeat.key)}
                type="button"
              >
                자리 비우기
              </button>
            </div>
          </aside>
        ) : null}
      </div>
      <div className="seat-debug-indicator">
        선택된 좌석: {selectedSeatKey ?? "없음"} · 권한: {canManageSeats ? "관리자" : "읽기 전용"}
      </div>
    </section>
  );
}
