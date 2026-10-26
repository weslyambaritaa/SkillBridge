const reasons: Record<string, string> = {
  "Verified business required": "business",
  "Business role required": "business",
  "Project cannot be submitted in this state": "state",
  "Project content is incomplete": "content",
  "Project category is unavailable": "category",
  "At least one project role is required": "roles",
  "Every role requires at least one required skill": "skills",
  "Project uses inactive skills": "inactive_skills",
};

export function projectSubmissionReason(message: string): string {
  return reasons[message] ?? "unavailable";
}

export const projectSubmissionMessages: Record<string, string> = {
  business: "Usaha harus berstatus VERIFIED sebelum proyek dikirim untuk review.",
  state: "Proyek hanya dapat dikirim dari status DRAFT, REVISION_REQUESTED, atau REJECTED dan belum dibatalkan. Periksa status review terbaru.",
  content: "Lengkapi judul, masalah, tujuan, lingkup, dan hasil yang diharapkan sebelum mengirim proyek.",
  category: "Kategori proyek sudah tidak tersedia. Edit proyek dan pilih kategori aktif.",
  roles: "Tambahkan minimal satu role pada proyek, lalu simpan draft sebelum mengirim.",
  skills: "Setiap role harus memiliki minimal satu skill wajib (Required). Edit proyek, pilih skill wajib, lalu simpan draft.",
  inactive_skills: "Ada skill yang sudah tidak aktif. Edit proyek dan pilih skill aktif sebelum mengirim.",
  unavailable: "Pengiriman proyek gagal. Coba kembali; jika tetap gagal, hubungi admin.",
};
