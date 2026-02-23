/**
 * Generates a unique Vercel-style ID
 * Format: VRC-YYYY-MM-DD-XXXXXXXX
 */
export function generateVercelId() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomPart = "";
  for (let i = 0; i < 8; i++) {
    randomPart += chars[Math.floor(Math.random() * chars.length)];
  }
  return `VRC-${yyyy}-${mm}-${dd}-${randomPart}`;
}
