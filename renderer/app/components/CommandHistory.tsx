import { Clock, Trash2 } from "lucide-react";
import { Button } from "./ui/button";

export default function CommandHistory() {
  const history = [
    {
      id: "1",
      command: "git push origin main",
      timestamp: "2026-03-09 14:30:25",
      status: "success",
    },
    {
      id: "2",
      command: "npm run build",
      timestamp: "2026-03-09 14:28:10",
      status: "success",
    },
    {
      id: "3",
      command: "docker-compose up -d",
      timestamp: "2026-03-09 14:25:45",
      status: "error",
    },
    {
      id: "4",
      command: "npm install axios",
      timestamp: "2026-03-09 14:20:12",
      status: "success",
    },
    {
      id: "5",
      command: "git commit -m 'update feature'",
      timestamp: "2026-03-09 14:15:30",
      status: "success",
    },
  ];

  return (
    <div className="h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">历史命令记录</h2>
            <p className="text-sm text-gray-600 mt-1">查看最近执行的命令历史</p>
          </div>
          <Button variant="outline" size="sm">
            <Trash2 className="w-4 h-4 mr-1" />
            清空历史
          </Button>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-5xl mx-auto space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <code className="block bg-gray-900 text-green-400 px-4 py-3 rounded font-mono text-sm mb-3">
                    {item.command}
                  </code>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{item.timestamp}</span>
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        item.status === "success"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.status === "success" ? "成功" : "失败"}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Trash2 className="w-4 h-4 text-gray-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}