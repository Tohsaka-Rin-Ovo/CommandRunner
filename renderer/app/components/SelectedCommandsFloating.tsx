import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";

interface Command {
  id: string;
  content: string;
  description?: string;
}

interface SelectedCommandsFloatingProps {
  commands: Command[];
  onRemove: (id: string) => void;
  onClear?: () => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onReorder?: (fromIndex: number, toIndex: number, position: "before" | "after") => void;
  visible: boolean;
  container?: HTMLElement | null;
}

function AutoScrollText({
  text,
  className,
  title,
}: {
  text: string;
  className?: string;
  title?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const [overflowDistance, setOverflowDistance] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const updateOverflow = () => {
      if (!containerRef.current || !contentRef.current) return;

      const nextDistance = Math.max(
        0,
        contentRef.current.scrollWidth - containerRef.current.clientWidth
      );

      setOverflowDistance(nextDistance);
    };

    updateOverflow();

    const resizeObserver = new ResizeObserver(() => {
      updateOverflow();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [text]);

  const duration = Math.max(2.2, overflowDistance / 28);

  return (
    <div
      ref={containerRef}
      className="selected-command-text overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={title ?? text}
    >
      <span
        ref={contentRef}
        className={`inline-block min-w-max whitespace-nowrap ${className ?? ""}`.trim()}
        style={{
          transform: isHovered && overflowDistance > 0 ? `translateX(-${overflowDistance}px)` : "translateX(0)",
          transition: isHovered && overflowDistance > 0
            ? `transform ${duration}s cubic-bezier(0.22, 1, 0.36, 1) 0.3s`
            : "transform 0.25s ease-out",
        }}
      >
        {text}
      </span>
    </div>
  );
}

export function SelectedCommandsFloating({ commands, onRemove, onClear, onMoveUp, onMoveDown, onReorder, visible, container }: SelectedCommandsFloatingProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(null);
  const [recentlyMovedId, setRecentlyMovedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.createElement("div");
    root.setAttribute("data-selected-commands-root", "true");
    document.body.appendChild(root);
    setPortalTarget(root);

    return () => {
      root.remove();
    };
  }, []);

  useEffect(() => {
    if (!portalTarget) return;

    portalTarget.removeAttribute("aria-hidden");
    portalTarget.removeAttribute("data-aria-hidden");
    portalTarget.removeAttribute("inert");
  }, [portalTarget, visible, commands.length]);

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggingId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>, targetId: string) => {
    if (!draggingId || draggingId === targetId) return;

    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const nextPosition = event.clientY < rect.top + rect.height / 2 ? "before" : "after";

    setDragOverId(targetId);
    setDropPosition(nextPosition);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    const relatedTarget = event.relatedTarget as Node | null;

    if (!relatedTarget || !event.currentTarget.contains(relatedTarget)) {
      setDragOverId(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, targetId: string) => {
    if (!draggingId || draggingId === targetId || !dropPosition || !onReorder) {
      setDragOverId(null);
      setDropPosition(null);
      setDraggingId(null);
      return;
    }

    event.preventDefault();

    const fromIndex = commands.findIndex((cmd) => cmd.id === draggingId);
    const toIndex = commands.findIndex((cmd) => cmd.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      onReorder(fromIndex, toIndex, dropPosition);
      setRecentlyMovedId(draggingId);
    }

    setDragOverId(null);
    setDropPosition(null);
    setDraggingId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
    setDropPosition(null);
  };

  useEffect(() => {
    if (!recentlyMovedId) return;

    const timeout = window.setTimeout(() => {
      setRecentlyMovedId(null);
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [recentlyMovedId]);

  if (!portalTarget) return null;

  return createPortal(
    <AnimatePresence>
      {visible && commands.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-6 right-6 z-[100] pointer-events-auto w-[320px] bg-white rounded-2xl shadow-xl border border-gray-200/80 overflow-hidden flex flex-col backdrop-blur-sm"
          style={{ maxHeight: "400px" }}
          onWheelCapture={(event) => event.stopPropagation()}
        >
          <div className="p-3.5 bg-gradient-to-b from-blue-50/50 to-white border-b border-gray-200/80 flex items-center justify-between gap-3 shrink-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-semibold text-sm text-gray-900">已选择命令</span>
              <span className="bg-blue-100 text-blue-700 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0">
                {commands.length}
              </span>
            </div>
            {onClear && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] text-red-500 hover:text-red-600 hover:bg-red-50 px-2.5 shrink-0"
                onClick={onClear}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                清空
              </Button>
            )}
          </div>

          <div
            className="selected-commands-scroll-area custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white"
            style={{ maxHeight: "calc(400px - 57px)" }}
          >
            <div className="p-2.5 space-y-2">
              <AnimatePresence mode="popLayout">
                {commands.map((cmd, index) => (
                  <motion.div
                    key={cmd.id}
                    draggable={!!onReorder}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className={`group flex items-start gap-3 p-3 rounded-xl transition-all duration-200 border relative pr-16 shadow-[0_1px_0_rgba(0,0,0,0.02)] ${
                      draggingId === cmd.id
                        ? "scale-[0.985] opacity-45 border-2 border-dashed border-gray-300 bg-gray-50 shadow-none"
                        : "border-gray-100/80 hover:border-blue-100 hover:bg-blue-50/50"
                    } ${
                      recentlyMovedId === cmd.id
                        ? "selected-command-drop-feedback border-blue-200 bg-blue-50/80"
                        : ""
                    } ${
                      dragOverId === cmd.id && dropPosition === "before"
                        ? "border-t-[3px] border-t-blue-500 bg-blue-50/70 ring-2 ring-blue-100"
                        : ""
                    } ${
                      dragOverId === cmd.id && dropPosition === "after"
                        ? "border-b-[3px] border-b-blue-500 bg-blue-50/70 ring-2 ring-blue-100"
                        : ""
                    }`}
                    onDragStart={(event) => handleDragStart(event, cmd.id)}
                    onDragOver={(event) => handleDragOver(event, cmd.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(event) => handleDrop(event, cmd.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-medium font-mono text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors cursor-grab active:cursor-grabbing">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <AutoScrollText
                        text={cmd.content}
                        className="text-sm font-mono text-gray-800 leading-relaxed"
                      />
                      {cmd.description && (
                        <div className="mt-1.5">
                          <AutoScrollText
                            text={cmd.description}
                            className="text-[11px] text-gray-500 leading-tight"
                          />
                        </div>
                      )}
                    </div>

                    {onMoveUp && onMoveDown && (
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity absolute right-8 top-2.5">
                        <button
                          type="button"
                          onClick={() => onMoveUp(index)}
                          disabled={index === 0}
                          className="p-0.5 hover:bg-blue-100 rounded disabled:opacity-20 text-gray-400 hover:text-blue-600 transition-colors"
                          title="上移"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMoveDown(index)}
                          disabled={index === commands.length - 1}
                          className="p-0.5 hover:bg-blue-100 rounded disabled:opacity-20 text-gray-400 hover:text-blue-600 transition-colors"
                          title="下移"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-all text-gray-400 hover:text-red-500 hover:bg-red-50"
                      onClick={() => onRemove(cmd.id)}
                      title="移除"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    portalTarget
  );
}
