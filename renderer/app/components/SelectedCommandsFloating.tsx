import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
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
  visible: boolean;
}

export function SelectedCommandsFloating({ commands, onRemove, onClear, onMoveUp, onMoveDown, visible }: SelectedCommandsFloatingProps) {
  // Use a portal to render into document.body to ensure it is above other elements (like Dialog overlay)
  // and not clipped by Dialog content.
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {visible && commands.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-6 right-6 z-[100] w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
          style={{ maxHeight: "400px" }}
        >
          <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-gray-900">已选择的命令</span>
              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {commands.length}
              </span>
            </div>
            {onClear && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 px-2"
                onClick={onClear}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                清空
              </Button>
            )}
          </div>
          
          <ScrollArea className="flex-1 overflow-y-auto bg-white">
            <div className="p-2 space-y-1">
              <AnimatePresence mode="popLayout">
                {commands.map((cmd, index) => (
                  <motion.div 
                    key={cmd.id} 
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="group flex items-start gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100 relative pr-8"
                  >
                    <span className="text-xs text-gray-400 mt-1.5 font-mono w-4 text-center shrink-0">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <code className="text-sm font-mono block text-gray-700 truncate" title={cmd.content}>{cmd.content}</code>
                      {cmd.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{cmd.description}</p>}
                    </div>
                    
                    {onMoveUp && onMoveDown && (
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity absolute right-8 top-1">
                        <button
                          type="button"
                          onClick={() => onMoveUp(index)}
                          disabled={index === 0}
                          className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30 text-gray-500"
                          title="上移"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMoveDown(index)}
                          disabled={index === commands.length - 1}
                          className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30 text-gray-500"
                          title="下移"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-red-50"
                      onClick={() => onRemove(cmd.id)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
