// @vitest-environment jsdom

import { Activity, createElement, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PageContent } from "../src/components/page-content";
import { ToolGrid } from "../src/components/tool-grid";
import { tools } from "../src/lib/tools";

const route = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
afterEach(cleanup);

// Model the router retaining previously visited pages inside hidden Activity boundaries.
function RetainedRoutes({ pathname }: { pathname: string }) {
  const [visited, setVisited] = useState([pathname]);
  if (!visited.includes(pathname)) setVisited([...visited, pathname]);
  return visited.map((path) => {
    const tool = tools.find((entry) => `/tools/${entry.slug}` === path);
    // ActivityProps requires children in the props object when using createElement.
    // eslint-disable-next-line react/no-children-prop
    return createElement(Activity, {
      key: path,
      mode: path === pathname ? "visible" : "hidden",
      children: path === "/" ? createElement(ToolGrid) : createElement("main", null,
        createElement("h1", null, tool?.name),
        !tool?.available && createElement("span", null, "Coming soon"),
      ),
    });
  });
}

const content = () => createElement(PageContent, null,
  createElement(RetainedRoutes, { pathname: route.pathname }),
);

describe("page content on navigation", () => {
  for (const tool of tools) {
    it(`removes the old home-page labels when the header opens ${tool.name}`, () => {
      route.pathname = "/";
      const view = render(content());
      expect(screen.getAllByText("Coming soon", { exact: true })).toHaveLength(1);

      route.pathname = `/tools/${tool.slug}`;
      view.rerender(content());
      expect(screen.queryAllByText("Coming soon", { exact: true })).toHaveLength(tool.available ? 0 : 1);
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(tool.name);
    });
  }

  it("keeps home-page filters when only the hash changes", () => {
    route.pathname = "/";
    const view = render(content());
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "merge" } });
    view.rerender(content());
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("merge");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});
