import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const alt = "GlamChain Studio — the salon command centre";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONTS_DIR = join(process.cwd(), "src/app/fonts");

const playfairBold = readFileSync(join(FONTS_DIR, "Playfair-Bold.ttf"));
const playfairSemiBold = readFileSync(join(FONTS_DIR, "Playfair-SemiBold.ttf"));
const manropeMedium = readFileSync(join(FONTS_DIR, "Manrope-Medium.ttf"));
const manropeBold = readFileSync(join(FONTS_DIR, "Manrope-Bold.ttf"));

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#f7f1e6",
          backgroundImage:
            "radial-gradient(ellipse 700px 480px at 78% 18%, rgba(200,162,75,0.16), transparent 70%), radial-gradient(ellipse 560px 420px at 8% 96%, rgba(196,124,84,0.10), transparent 70%)",
        }}
      >
        {/* decorative oversized arch — right side, barely-there gold */}
        <div
          style={{
            width: 560,
            height: 700,
            borderRadius: "280px 280px 0 0",
            border: "2px solid rgba(200,162,75,0.35)",
            display: "flex",
            position: "absolute",
            right: -72,
            top: 120,
          }}
        />
        <div
          style={{
            width: 560,
            height: 700,
            borderRadius: "280px 280px 0 0",
            border: "1px solid rgba(23,18,16,0.10)",
            display: "flex",
            position: "absolute",
            right: -44,
            top: 92,
          }}
        />

        {/* main copy block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 80px",
            width: 1200,
            height: 630,
          }}
        >
          {/* monogram chip */}
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              background: "#1a1410",
              border: "2px solid rgba(200,162,75,0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontFamily: "Playfair Bold",
                fontSize: 52,
                color: "#e9ce8c",
                display: "flex",
              }}
            >
              G
            </div>
          </div>

          {/* eyebrow */}
          <div
            style={{
              fontFamily: "Manrope Bold",
              fontSize: 21,
              letterSpacing: 10,
              color: "#b8923f",
              display: "flex",
              marginTop: 34,
            }}
          >
            GLAMCHAIN STUDIO
          </div>

          {/* headline */}
          <div
            style={{
              fontFamily: "Playfair Bold",
              fontSize: 96,
              color: "#241b15",
              display: "flex",
              marginTop: 14,
              lineHeight: 1.08,
            }}
          >
            The salon command centre.
          </div>

          {/* italic sub */}
          <div
            style={{
              fontFamily: "Playfair SemiBold",
              fontStyle: "italic",
              fontSize: 36,
              color: "#8a6d3f",
              display: "flex",
              marginTop: 16,
            }}
          >
            run the day, grow the guest book
          </div>

          {/* hairline */}
          <div
            style={{
              width: 520,
              height: 2,
              background: "linear-gradient(90deg, rgba(200,162,75,0.8), rgba(200,162,75,0.05))",
              display: "flex",
              marginTop: 42,
            }}
          />

          {/* feature line */}
          <div
            style={{
              fontFamily: "Manrope Medium",
              fontSize: 24,
              color: "rgba(36,27,21,0.72)",
              display: "flex",
              marginTop: 24,
              letterSpacing: 1,
            }}
          >
            Today&#8217;s chair · Guests &amp; VIPs · WhatsApp marketing · Financials
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [
      { name: "Playfair Bold", data: playfairBold, style: "normal" },
      { name: "Playfair SemiBold", data: playfairSemiBold, style: "italic" },
      { name: "Manrope Medium", data: manropeMedium, style: "normal" },
      { name: "Manrope Bold", data: manropeBold, style: "normal" },
    ] }
  );
}
