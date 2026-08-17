import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export function SeoBreadcrumbs({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-left text-xs text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="size-3" />
        </li>
        <li>
          <Link to="/tools" className="hover:text-foreground">
            Tools
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="size-3" />
        </li>
        <li className="font-medium text-foreground" aria-current="page">
          {current}
        </li>
      </ol>
    </nav>
  );
}
