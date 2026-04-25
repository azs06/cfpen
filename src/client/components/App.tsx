import { useMemo } from "react";
import { EditorPage } from "./EditorPage";
import { SharedPage } from "./SharedPage";

export function App() {
  const route = useMemo(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] === "p" && parts[1]) {
      return { name: "shared" as const, slug: parts[1] };
    }

    if (parts[0] === "editor" && parts[1]) {
      return { name: "editor" as const, id: parts[1] };
    }

    return { name: "home" as const };
  }, []);

  if (route.name === "shared") {
    return <SharedPage slug={route.slug} />;
  }

  return <EditorPage initialPenId={route.name === "editor" ? route.id : null} />;
}
