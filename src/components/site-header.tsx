import { groupedTools } from "@/lib/tools";
import { Brand } from "@/components/brand";
import { ToolNavigation } from "@/components/tool-navigation";

export function SiteHeader() {
  return (
    <header className="header">
      <div className="site-header">
        <Brand />
        <ToolNavigation groups={groupedTools} />
      </div>
    </header>
  );
}
