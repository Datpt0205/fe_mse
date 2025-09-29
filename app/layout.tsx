import "./global.css";

export const metadata = {
  title: "JobRecs",
  description: "Jobs • CV OCR • Analysis • Skill Match",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-white text-gray-900">{children}</body>
    </html>
  );
}
