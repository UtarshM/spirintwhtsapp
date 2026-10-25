"use client";
import { useState } from "react";
import QRCode from "qrcode";
import { chatLink } from "@/lib/outreach";
import { Panel, formValue, download } from "./ui";
export default function Links({
  notify,
  mode = "links",
}: {
  notify: (s: string) => void;
  mode?: string;
}) {
  const [link, setLink] = useState(""),
    [qr, setQr] = useState(""),
    [embed, setEmbed] = useState("");
  return (
    <Panel
      title={
        mode === "qr"
          ? "WhatsApp QR codes"
          : mode === "widget"
            ? "Website chat button"
            : "WhatsApp links"
      }
      description="Generate locally. Your number and message are encoded into the link; nothing is sent by this tool."
    >
      <form
        className="console-narrow"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const f = new FormData(e.currentTarget);
            const url = chatLink(
              formValue(f, "phone"),
              formValue(f, "message"),
            );
            setLink(url);
            setQr(
              await QRCode.toDataURL(url, {
                width: 320,
                margin: 2,
                errorCorrectionLevel: "M",
              }),
            );
            setEmbed(
              `<a href="${url.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;padding:12px 20px;border-radius:24px;background:#145e50;color:white;font:600 16px system-ui;text-decoration:none">Chat with us</a>`,
            );
          } catch (err) {
            notify((err as Error).message);
          }
        }}
      >
        <label>
          Business WhatsApp number
          <input
            name="phone"
            required
            placeholder="+919876543210"
            maxLength={25}
          />
        </label>
        <label>
          Prefilled message
          <textarea
            name="message"
            rows={3}
            maxLength={1000}
            defaultValue="Hi, I’d like to know more."
          />
        </label>
        <button className="primary">Generate link & QR</button>
      </form>
      {link && (
        <div className="console-link-result">
          <div>
            <label>
              Generated link
              <input readOnly value={link} />
            </label>
            <button
              className="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  notify("Link copied");
                } catch {
                  notify("Select and copy the link manually");
                }
              }}
            >
              Copy link
            </button>
            <label>
              Website chat button HTML
              <textarea rows={5} readOnly value={embed} />
            </label>
            <button
              className="secondary"
              onClick={() =>
                download("whatsapp-button.html", embed, "text/html")
              }
            >
              Download button HTML
            </button>
            <p>
              Opening this link launches WhatsApp. Sending a message requires an
              action there.
            </p>
          </div>
          <div>
            {/* Local QR generated from the exact link above. */}
            <img
              src={qr}
              width={240}
              height={240}
              alt="QR code for generated WhatsApp link"
            />
            <a className="secondary" href={qr} download="whatsapp-chat-qr.png">
              Download QR
            </a>
          </div>
        </div>
      )}
    </Panel>
  );
}
