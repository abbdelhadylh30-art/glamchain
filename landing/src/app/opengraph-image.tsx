import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const alt = "GlamChain — Maison de Beauté · Luxury Salon in West Bay, Doha";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONTS_DIR = join(process.cwd(), "src/app/fonts");
const IMAGES_DIR = join(process.cwd(), "public/images");

const playfairBold = readFileSync(join(FONTS_DIR, "Playfair-Bold.ttf"));
const playfairSemiBold = readFileSync(join(FONTS_DIR, "Playfair-SemiBold.ttf"));
const manropeMedium = readFileSync(join(FONTS_DIR, "Manrope-Medium.ttf"));
const manropeBold = readFileSync(join(FONTS_DIR, "Manrope-Bold.ttf"));
const heroImage = `data:image/jpeg;base64,${readFileSync(join(FONTS_DIR, "og-hero.jpg")).toString("base64")}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#171210",
        }}
      >
        {/* ─── Left · brand panel ─── */}
        <div
          style={{
            width: 736,
            height: 630,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 60px 0 72px",
            backgroundImage:
              "radial-gradient(ellipse 480px 360px at 18% 30%, rgba(200,162,75,0.14), transparent 70%)",
          }}
        >
          {/* eyebrow */}
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 64,
                height: 2,
                background: "linear-gradient(90deg, transparent, #c8a24b)",
                display: "flex",
              }}
            />
            <div
              style={{
                fontFamily: "Manrope Bold",
                fontSize: 19,
                letterSpacing: 9,
                color: "#c8a24b",
                display: "flex",
              }}
            >
              MAISON DE BEAUTÉ
            </div>
          </div>

          {/* wordmark */}
          <div
            style={{
              fontFamily: "Playfair Bold",
              fontSize: 128,
              color: "#f3ead9",
              display: "flex",
              marginTop: 18,
              lineHeight: 1.05,
            }}
          >
            GlamChain
          </div>

          {/* italic tagline */}
          <div
            style={{
              fontFamily: "Playfair SemiBold",
              fontStyle: "italic",
              fontSize: 38,
              color: "#e9ce8c",
              display: "flex",
              marginTop: 10,
            }}
          >
            where beauty feels at home
          </div>

          {/* hairline + meta */}
          <div
            style={{
              width: 560,
              height: 1,
              background: "linear-gradient(90deg, rgba(200,162,75,0.65), rgba(200,162,75,0.08))",
              display: "flex",
              marginTop: 44,
            }}
          />
          <div
            style={{
              fontFamily: "Manrope Medium",
              fontSize: 22,
              color: "rgba(243,234,217,0.72)",
              display: "flex",
              marginTop: 22,
              letterSpacing: 1,
            }}
          >
            Signature rituals · Master stylists · Effortless booking
          </div>
          <div
            style={{
              fontFamily: "Manrope Medium",
              fontSize: 22,
              color: "rgba(243,234,217,0.72)",
              display: "flex",
              marginTop: 10,
              letterSpacing: 1,
            }}
          >
            West Bay · Doha
          </div>

          {/* footer chip row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 48 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 13,
                border: "1.5px solid rgba(200,162,75,0.85)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(200,162,75,0.08)",
              }}
            >
              <div
                style={{
                  fontFamily: "Playfair Bold",
                  fontSize: 30,
                  color: "#e9ce8c",
                  display: "flex",
                }}
              >
                G
              </div>
            </div>
            <div
              style={{
                fontFamily: "Manrope Bold",
                fontSize: 20,
                color: "#c8a24b",
                letterSpacing: 4,
                display: "flex",
              }}
            >
              GLAMCHAIN.QA
            </div>
          </div>
        </div>

        {/* ─── divider hairline ─── */}
        <div
          style={{
            width: 1.5,
            height: 630,
            background: "linear-gradient(180deg, transparent, rgba(200,162,75,0.55), transparent)",
            display: "flex",
          }}
        />

        {/* ─── Right · arch portrait ─── */}
        <div
          style={{
            width: 462,
            height: 630,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#120d09",
            backgroundImage:
              "radial-gradient(ellipse 400px 500px at 50% 100%, rgba(200,162,75,0.10), transparent 70%)",
            position: "relative",
          }}
        >
          {/* offset gold arch outline — peeks top-left of the photo */}
          <div
            style={{
              width: 330,
              height: 470,
              borderRadius: "165px 165px 0 0",
              border: "1.5px solid rgba(200,162,75,0.5)",
              display: "flex",
              position: "absolute",
              left: 44,
              top: 38,
            }}
          />
          {/* arch photo */}
          <div
            style={{
              width: 344,
              height: 500,
              borderRadius: "172px 172px 0 0",
              overflow: "hidden",
              display: "flex",
              boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "flex",
              }}
              alt="GlamChain salon interior"
            />
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
