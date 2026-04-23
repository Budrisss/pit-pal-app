import jsPDF from "jspdf";

interface SetupRow {
  id: string;
  setup_name: string | null;
  session_name: string | null;
  created_at: string;
  fastest_lap_time: string | null;
  notes_times: string | null;
  // alignment
  lf_camber?: number | null; rf_camber?: number | null; lr_camber?: number | null; rr_camber?: number | null;
  lf_caster?: number | null; rf_caster?: number | null;
  lf_toe?: number | null; rf_toe?: number | null; lr_toe?: number | null; rr_toe?: number | null;
  lf_ride_height?: number | null; rf_ride_height?: number | null; lr_ride_height?: number | null; rr_ride_height?: number | null;
  // springs/shocks
  lf_spring?: number | null; rf_spring?: number | null; lr_spring?: number | null; rr_spring?: number | null;
  lf_shock?: number | null; rf_shock?: number | null; lr_shock?: number | null; rr_shock?: number | null;
  // weights
  front_percentage?: number | null; rear_percentage?: number | null;
  left_percentage?: number | null; right_percentage?: number | null;
  cross_percentage?: number | null;
  // pressures
  fl_cold_pressure?: number | null; fl_hot_pressure?: number | null;
  fr_cold_pressure?: number | null; fr_hot_pressure?: number | null;
  rl_cold_pressure?: number | null; rl_hot_pressure?: number | null;
  rr_cold_pressure?: number | null; rr_hot_pressure?: number | null;
  // temps
  fl_temp_inside?: number | null; fl_temp_center?: number | null; fl_temp_outside?: number | null;
  fr_temp_inside?: number | null; fr_temp_center?: number | null; fr_temp_outside?: number | null;
  rl_temp_inside?: number | null; rl_temp_center?: number | null; rl_temp_outside?: number | null;
  rr_temp_inside?: number | null; rr_temp_center?: number | null; rr_temp_outside?: number | null;
  [k: string]: any;
}

interface CarInfo { name?: string; year?: number | null; make?: string | null; model?: string | null }
interface EventInfo { name?: string; date?: string; trackName?: string | null; address?: string | null }
interface AttachmentInfo { file_name: string }
interface TirePhotoInfo { corner: string; file_name: string }

const fmt = (v: number | null | undefined) => (v === null || v === undefined || isNaN(Number(v)) ? "—" : String(v));
const hasAny = (...vals: Array<number | null | undefined>) => vals.some((v) => v !== null && v !== undefined);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "setup";

export function exportSetupToPdf(
  setup: SetupRow,
  car: CarInfo | null,
  event: EventInfo | null,
  attachments: AttachmentInfo[],
  tirePhotos: TirePhotoInfo[]
) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const ensureSpace = (need: number) => {
    if (y + need > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const heading = (text: string) => {
    ensureSpace(24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text(text, margin, y);
    y += 6;
    doc.setDrawColor(180);
    doc.line(margin, y, pageW - margin, y);
    y += 12;
  };

  const line = (label: string, value: string) => {
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20);
    doc.text(value, margin + 110, y);
    y += 13;
  };

  const cornerGrid = (title: string, rows: Array<{ label: string; lf: any; rf: any; lr: any; rr: any }>) => {
    heading(title);
    const colW = (pageW - margin * 2) / 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(80);
    ["", "LF", "RF", "LR", "RR"].forEach((h, i) => doc.text(h, margin + colW * i + 4, y));
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20);
    rows.forEach((r) => {
      ensureSpace(13);
      doc.setFont("helvetica", "bold");
      doc.text(r.label, margin + 4, y);
      doc.setFont("helvetica", "normal");
      [r.lf, r.rf, r.lr, r.rr].forEach((v, i) => doc.text(fmt(v), margin + colW * (i + 1) + 4, y));
      y += 13;
    });
    y += 6;
  };

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20);
  doc.text(setup.setup_name || "Untitled Setup", margin, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Created ${new Date(setup.created_at).toLocaleDateString()}`, margin, y);
  if (setup.fastest_lap_time) doc.text(`Fastest Lap: ${setup.fastest_lap_time}`, pageW - margin, y, { align: "right" });
  y += 18;

  // Metadata
  heading("Details");
  if (car) {
    const carDesc = [car.year, car.make, car.model].filter(Boolean).join(" ");
    line("Car", `${car.name || ""}${carDesc ? ` (${carDesc})` : ""}`);
  }
  if (event) {
    line("Event", `${event.name || ""}${event.date ? ` — ${new Date(event.date).toLocaleDateString()}` : ""}`);
    if (event.trackName) line("Track", event.trackName);
    else if (event.address) line("Location", event.address);
  }
  if (setup.session_name) line("Session", setup.session_name);

  // Alignment
  if (hasAny(
    setup.lf_camber, setup.rf_camber, setup.lr_camber, setup.rr_camber,
    setup.lf_caster, setup.rf_caster,
    setup.lf_toe, setup.rf_toe, setup.lr_toe, setup.rr_toe,
    setup.lf_ride_height, setup.rf_ride_height, setup.lr_ride_height, setup.rr_ride_height,
  )) {
    cornerGrid("Alignment", [
      { label: "Camber", lf: setup.lf_camber, rf: setup.rf_camber, lr: setup.lr_camber, rr: setup.rr_camber },
      { label: "Caster", lf: setup.lf_caster, rf: setup.rf_caster, lr: "—", rr: "—" },
      { label: "Toe",    lf: setup.lf_toe,    rf: setup.rf_toe,    lr: setup.lr_toe,    rr: setup.rr_toe },
      { label: "Ride H", lf: setup.lf_ride_height, rf: setup.rf_ride_height, lr: setup.lr_ride_height, rr: setup.rr_ride_height },
    ]);
  }

  // Springs & shocks
  if (hasAny(setup.lf_spring, setup.rf_spring, setup.lr_spring, setup.rr_spring, setup.lf_shock, setup.rf_shock, setup.lr_shock, setup.rr_shock)) {
    cornerGrid("Springs & Shocks", [
      { label: "Spring", lf: setup.lf_spring, rf: setup.rf_spring, lr: setup.lr_spring, rr: setup.rr_spring },
      { label: "Shock",  lf: setup.lf_shock,  rf: setup.rf_shock,  lr: setup.lr_shock,  rr: setup.rr_shock },
    ]);
  }

  // Weights
  if (hasAny(setup.front_percentage, setup.rear_percentage, setup.left_percentage, setup.right_percentage, setup.cross_percentage)) {
    heading("Weight Distribution");
    line("Front %", fmt(setup.front_percentage));
    line("Rear %", fmt(setup.rear_percentage));
    line("Left %", fmt(setup.left_percentage));
    line("Right %", fmt(setup.right_percentage));
    line("Cross %", fmt(setup.cross_percentage));
  }

  // Pressures
  if (hasAny(
    setup.fl_cold_pressure, setup.fl_hot_pressure, setup.fr_cold_pressure, setup.fr_hot_pressure,
    setup.rl_cold_pressure, setup.rl_hot_pressure, setup.rr_cold_pressure, setup.rr_hot_pressure,
  )) {
    cornerGrid("Tire Pressures", [
      { label: "Cold", lf: setup.fl_cold_pressure, rf: setup.fr_cold_pressure, lr: setup.rl_cold_pressure, rr: setup.rr_cold_pressure },
      { label: "Hot",  lf: setup.fl_hot_pressure,  rf: setup.fr_hot_pressure,  lr: setup.rl_hot_pressure,  rr: setup.rr_hot_pressure },
    ]);
  }

  // Temps
  if (hasAny(
    setup.fl_temp_inside, setup.fl_temp_center, setup.fl_temp_outside,
    setup.fr_temp_inside, setup.fr_temp_center, setup.fr_temp_outside,
    setup.rl_temp_inside, setup.rl_temp_center, setup.rl_temp_outside,
    setup.rr_temp_inside, setup.rr_temp_center, setup.rr_temp_outside,
  )) {
    cornerGrid("Tire Temps", [
      { label: "Inside",  lf: setup.fl_temp_inside,  rf: setup.fr_temp_inside,  lr: setup.rl_temp_inside,  rr: setup.rr_temp_inside },
      { label: "Center",  lf: setup.fl_temp_center,  rf: setup.fr_temp_center,  lr: setup.rl_temp_center,  rr: setup.rr_temp_center },
      { label: "Outside", lf: setup.fl_temp_outside, rf: setup.fr_temp_outside, lr: setup.rl_temp_outside, rr: setup.rr_temp_outside },
    ]);
  }

  // Notes
  if (setup.notes_times) {
    heading("Notes");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(20);
    const lines = doc.splitTextToSize(setup.notes_times, pageW - margin * 2);
    lines.forEach((ln: string) => {
      ensureSpace(13);
      doc.text(ln, margin, y);
      y += 13;
    });
    y += 4;
  }

  // Attachments
  if (attachments.length > 0) {
    heading("Attached Files");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("(Stored in app — not embedded in this PDF)", margin, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(20);
    attachments.forEach((a) => {
      ensureSpace(13);
      doc.text(`• ${a.file_name}`, margin, y);
      y += 13;
    });
  }

  // Tire wear photos
  if (tirePhotos.length > 0) {
    heading("Tire Wear Photos");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("(Stored in app — not embedded in this PDF)", margin, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(20);
    tirePhotos.forEach((p) => {
      ensureSpace(13);
      doc.text(`• [${p.corner}] ${p.file_name}`, margin, y);
      y += 13;
    });
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(
      `Generated by Track Side Ops • ${new Date().toLocaleDateString()}`,
      pageW / 2,
      pageH - 20,
      { align: "center" }
    );
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 20, { align: "right" });
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`setup-${slug(setup.setup_name || "untitled")}-${dateStr}.pdf`);
}