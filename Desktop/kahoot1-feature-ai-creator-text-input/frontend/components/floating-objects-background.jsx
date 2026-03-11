"use client";

import { useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Calculator,
  Pencil,
  Rocket,
  Eraser,
  FlaskConical,
  Pin,
  GraduationCap,
  Notebook,
  Search,
  Microscope,
  Atom,
  Ruler,
  PenTool,
  Compass,
  Lightbulb,
  BadgePlus,
} from "lucide-react";

const OBJECTS = [
  { id: "n1", kind: "text", value: "1", x: 6, y: 8, size: 26 },
  { id: "n2", kind: "text", value: "2", x: 19, y: 10, size: 26 },
  { id: "n3", kind: "text", value: "3", x: 82, y: 12, size: 26 },
  { id: "n4", kind: "text", value: "4", x: 90, y: 22, size: 24 },
  { id: "n5", kind: "text", value: "5", x: 94, y: 46, size: 24 },
  { id: "n6", kind: "text", value: "6", x: 88, y: 72, size: 24 },
  { id: "n7", kind: "text", value: "7", x: 74, y: 85, size: 24 },
  { id: "n8", kind: "text", value: "8", x: 48, y: 92, size: 24 },
  { id: "n9", kind: "text", value: "9", x: 21, y: 86, size: 24 },
  { id: "n0", kind: "text", value: "0", x: 8, y: 64, size: 24 },
  { id: "tA", kind: "text", value: "A", x: 14, y: 18, size: 24 },
  { id: "tB", kind: "text", value: "B", x: 3, y: 34, size: 24 },
  { id: "tC", kind: "text", value: "C", x: 97, y: 56, size: 24 },
  { id: "tD", kind: "text", value: "D", x: 83, y: 36, size: 24 },
  { id: "tX", kind: "text", value: "x", x: 35, y: 13, size: 20 },
  { id: "tY", kind: "text", value: "y", x: 29, y: 73, size: 20 },
  { id: "tPi", kind: "text", value: "pi", x: 57, y: 9, size: 16 },
  { id: "tSum", kind: "text", value: "sum", x: 12, y: 90, size: 14 },
  { id: "tInt", kind: "text", value: "int", x: 70, y: 7, size: 15 },
  { id: "tSin", kind: "text", value: "sin", x: 64, y: 89, size: 14 },
  { id: "iBook", kind: "icon", Icon: BookOpen, x: 23, y: 29, size: 22 },
  { id: "iCalc", kind: "icon", Icon: Calculator, x: 62, y: 29, size: 22 },
  { id: "iPencil", kind: "icon", Icon: Pencil, x: 68, y: 13, size: 22 },
  { id: "iRocket", kind: "icon", Icon: Rocket, x: 40, y: 14, size: 22 },
  { id: "iEraser", kind: "icon", Icon: Eraser, x: 54, y: 13, size: 22 },
  { id: "iFlask", kind: "icon", Icon: FlaskConical, x: 9, y: 44, size: 20 },
  { id: "iPin", kind: "icon", Icon: Pin, x: 13, y: 53, size: 20 },
  { id: "iCap", kind: "icon", Icon: GraduationCap, x: 39, y: 24, size: 22 },
  { id: "iNotebook", kind: "icon", Icon: Notebook, x: 86, y: 29, size: 22 },
  { id: "iSearch", kind: "icon", Icon: Search, x: 88, y: 64, size: 20 },
  { id: "iMicroscope", kind: "icon", Icon: Microscope, x: 28, y: 55, size: 20 },
  { id: "iAtom", kind: "icon", Icon: Atom, x: 47, y: 78, size: 20 },
  { id: "iRuler", kind: "icon", Icon: Ruler, x: 7, y: 75, size: 20 },
  { id: "iPenTool", kind: "icon", Icon: PenTool, x: 76, y: 45, size: 20 },
  { id: "iCompass", kind: "icon", Icon: Compass, x: 93, y: 38, size: 20 },
  { id: "iLight", kind: "icon", Icon: Lightbulb, x: 58, y: 68, size: 20 },
  { id: "iBadge", kind: "icon", Icon: BadgePlus, x: 95, y: 14, size: 19 },
  { id: "iBook2", kind: "icon", Icon: BookOpen, x: 35, y: 90, size: 20 },
  { id: "iCalc2", kind: "icon", Icon: Calculator, x: 80, y: 79, size: 20 },
  { id: "iFlask2", kind: "icon", Icon: FlaskConical, x: 5, y: 23, size: 20 },
];

const OBJECT_COLORS = [
  "#6e94e6",
  "#67b7ea",
  "#839ff0",
  "#7dc6e6",
  "#93a6ea",
  "#6fb6d8",
  "#9daff4",
  "#74c5dd",
  "#87abe9",
  "#7ac9e7",
  "#9693f0",
  "#6fc0ea",
];

export function FloatingObjectsBackground() {
  const stageRef = useRef(null);
  const [positions, setPositions] = useState(() =>
    OBJECTS.reduce((acc, item) => {
      acc[item.id] = { x: item.x, y: item.y };
      return acc;
    }, {})
  );
  const [dragState, setDragState] = useState(null);

  const objects = useMemo(() => OBJECTS, []);

  function startDrag(event, id) {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const current = positions[id];
    const itemX = (current.x / 100) * rect.width;
    const itemY = (current.y / 100) * rect.height;

    setDragState({
      id,
      offsetX: event.clientX - rect.left - itemX,
      offsetY: event.clientY - rect.top - itemY,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!dragState || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();

    const xPx = event.clientX - rect.left - dragState.offsetX;
    const yPx = event.clientY - rect.top - dragState.offsetY;

    const x = Math.max(1, Math.min(99, (xPx / rect.width) * 100));
    const y = Math.max(2, Math.min(98, (yPx / rect.height) * 100));

    setPositions((prev) => ({
      ...prev,
      [dragState.id]: { x, y },
    }));
  }

  function endDrag() {
    setDragState(null);
  }

  return (
    <div
      ref={stageRef}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 480px at 20% -6%, rgba(255,255,255,0.84), transparent 70%), radial-gradient(920px 520px at 86% 8%, rgba(247,249,255,0.88), transparent 68%), linear-gradient(180deg, #e8ecf4 0%, #dde2ed 100%)",
        }}
      />

      <div className="absolute inset-0">
        {objects.map((item, idx) => {
          const pos = positions[item.id] ?? { x: item.x, y: item.y };
          const isDragged = dragState?.id === item.id;
          const visualSize = Math.round(item.size * 1.28);
          const color = OBJECT_COLORS[idx % OBJECT_COLORS.length];
          const style = {
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            fontSize: `${visualSize}px`,
            opacity: 0.74,
            color,
            transform: "translate(-50%, -50%)",
            animationDelay: `${(idx % 10) * 0.2}s`,
            animationDuration: `${2.9 + (idx % 5) * 0.35}s`,
          };

          return (
            <button
              key={item.id}
              type="button"
              onPointerDown={(event) => startDrag(event, item.id)}
              className={`absolute z-[1] rounded-md select-none touch-none transition-transform ${
                isDragged ? "cursor-grabbing scale-110" : "cursor-grab float-item"
              }`}
              style={style}
              aria-label={`Move background item ${item.id}`}
              tabIndex={-1}
            >
              {item.kind === "icon" ? <item.Icon size={visualSize} strokeWidth={1.8} /> : item.value}
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .float-item {
          animation-name: drift;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        @keyframes drift {
          0%,
          100% {
            transform: translate(-50%, -50%) translateY(0px) translateX(0px);
          }
          50% {
            transform: translate(-50%, -50%) translateY(-13px) translateX(9px);
          }
        }
      `}</style>
    </div>
  );
}
