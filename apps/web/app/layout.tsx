import "./globals.css";
import "katex/dist/katex.min.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#0f1115", color: "#e8eaed" }}>
        {children}
      </body>
    </html>
  );
}
