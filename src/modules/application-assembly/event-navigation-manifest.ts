import type { ModuleNavigationManifest } from "./models";

export const eventEngineNavigationManifest = {
  items: [
    { itemKey: "event-management", label: "活動管理", path: "/events" },
    {
      itemKey: "event-roster",
      label: "報名名單",
      path: "/events/registrations",
    },
    {
      itemKey: "event-checkin",
      label: "核銷管理",
      path: "/events/checkins",
    },
    {
      itemKey: "event-statistics",
      label: "活動統計",
      path: "/events/statistics",
    },
  ],
} as const satisfies ModuleNavigationManifest;
