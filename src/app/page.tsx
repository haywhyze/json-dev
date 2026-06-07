import { JsonTool } from "@/components/JsonTool";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <h1 className="text-lg font-semibold">JSON Formatter</h1>
        <ThemeToggle />
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        <JsonTool />
      </div>
    </main>
  );
}
