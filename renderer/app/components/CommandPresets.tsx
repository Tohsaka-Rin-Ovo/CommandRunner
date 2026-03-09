import { Database, Server, Code, Package } from "lucide-react";

export default function CommandPresets() {
  const presets = [
    {
      name: "数据库命令",
      icon: Database,
      commands: ["mysql -u root -p", "psql -U postgres", "mongo"],
    },
    {
      name: "服务器命令",
      icon: Server,
      commands: ["ssh user@host", "scp file.txt user@host:/path", "systemctl restart nginx"],
    },
    {
      name: "开发命令",
      icon: Code,
      commands: ["npm run dev", "npm run build", "npm test"],
    },
    {
      name: "包管理",
      icon: Package,
      commands: ["npm install", "yarn add", "pnpm install"],
    },
  ];

  return (
    <div className="h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">命令预设</h2>
        <p className="text-sm text-gray-600 mt-1">快速访问常用命令集合</p>
      </div>

      <div className="p-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {presets.map((preset) => (
            <div
              key={preset.name}
              className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <preset.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{preset.name}</h3>
              </div>
              <div className="space-y-2">
                {preset.commands.map((cmd, index) => (
                  <code
                    key={index}
                    className="block bg-gray-900 text-green-400 px-3 py-2 rounded font-mono text-sm"
                  >
                    {cmd}
                  </code>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}