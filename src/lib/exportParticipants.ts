export function exportParticipantsCsv(
  participants: {
    user_name: string;
    user_email: string;
    user_phone?: string | null;
    car_number?: number | null;
    notes?: string | null;
    created_at: string;
    registration_type_id: string;
  }[],
  registrationTypes: { id?: string; name: string }[],
  eventName: string
) {
  const rtMap = new Map(registrationTypes.map((rt) => [rt.id, rt.name]));

  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const headers = ["Name", "Email", "Phone", "Car #", "Registration Type", "Notes", "Registered On"];
  const rows = participants.map((p) => [
    escape(p.user_name),
    escape(p.user_email),
    p.user_phone ? escape(p.user_phone) : "",
    p.car_number != null ? String(p.car_number) : "",
    escape(rtMap.get(p.registration_type_id) || "Unknown"),
    p.notes ? escape(p.notes) : "",
    new Date(p.created_at).toLocaleDateString(),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${eventName.replace(/[^a-zA-Z0-9]/g, "_")}_participants.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
