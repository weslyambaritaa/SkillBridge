function readableStatus(value: string): string {
  const words = value.replaceAll("_", " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function label(value: string, labels: Record<string, string>): string {
  return labels[value] ?? readableStatus(value);
}

export function applicationStatusLabel(status: string): string {
  return label(status, {
    PENDING: "Menunggu keputusan UMKM",
    ACCEPTED: "Diterima, sedang mengerjakan project",
    REJECTED: "Lamaran ditolak",
    COMPLETED: "Project selesai",
    CLOSED: "Lamaran ditutup",
  });
}

export function verificationStatusLabel(status: string): string {
  return label(status, {
    UNVERIFIED: "Belum terverifikasi",
    PENDING: "Menunggu peninjauan",
    UNDER_REVIEW: "Sedang ditinjau",
    VERIFIED: "Terverifikasi",
    REQUEST_REVISION: "Perlu perbaikan",
    REVISION_REQUESTED: "Perlu perbaikan",
    REJECTED: "Verifikasi ditolak",
  });
}

export function projectModerationLabel(status: string): string {
  return label(status, {
    DRAFT: "Draf",
    SUBMITTED: "Menunggu peninjauan",
    UNDER_REVIEW: "Sedang ditinjau",
    REVISION_REQUESTED: "Perlu perbaikan",
    APPROVED: "Disetujui",
    REJECTED: "Ditolak",
    CANCELLED: "Dibatalkan",
  });
}

export function projectLifecycleLabel(status: string): string {
  return label(status, {
    NOT_STARTED: "Belum dimulai",
    ON_PROJECT: "Sedang dikerjakan",
    ACTIVE: "Sedang berjalan",
    COMPLETED: "Selesai",
    CANCELLED: "Dibatalkan",
  });
}

export function projectVisibilityLabel(status: string): string {
  return label(status, { PUBLIC: "Tayang publik", PRIVATE: "Privat", HIDDEN: "Tidak tayang" });
}

export function projectDifficultyLabel(status: string): string {
  return label(status, { BEGINNER: "Pemula", INTERMEDIATE: "Menengah", ADVANCED: "Lanjutan" });
}

export function projectPaymentLabel(status: string): string {
  return label(status, { PAID: "Berbayar", UNPAID: "Tidak berbayar" });
}

export function reviewDecisionLabel(status: string | null): string {
  if (!status) return "Menunggu keputusan";
  return label(status, { APPROVED: "Disetujui", REJECTED: "Ditolak", REQUEST_REVISION: "Perlu perbaikan" });
}
