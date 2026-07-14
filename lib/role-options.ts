export type Role = "admin" | "broker" | "viewer";

export const roleOptions: Array<{ value: Role; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "broker", label: "Broker" },
  { value: "viewer", label: "Viewer" },
];
