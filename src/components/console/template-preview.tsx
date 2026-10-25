import { Image as ImageIcon, Link2 } from "lucide-react";
import type { LocalTemplate } from "@/lib/local-workspace";
export type PreviewContent = Pick<
  LocalTemplate,
  "body" | "subject" | "mediaUrl" | "buttons" | "cards"
>;
function Buttons({ buttons }: { buttons: LocalTemplate["buttons"] }) {
  return (
    <div className="console-template-actions">
      {buttons.map((button, i) => (
        <span key={i} title={button.url || "Quick reply"}>
          <Link2 size={13} />
          {button.text || "Button label"}
          <small>{button.kind || "URL"}</small>
        </span>
      ))}
    </div>
  );
}
function Media({ url }: { url: string }) {
  return url ? (
    <div className="console-template-media">
      <ImageIcon size={25} />
      <span>
        Media reference<small>{url}</small>
      </span>
    </div>
  ) : null;
}
export default function TemplatePreview({
  content,
}: {
  content: PreviewContent;
}) {
  return (
    <div className="console-rich-preview">
      {content.subject && <h3>{content.subject}</h3>}
      <Media url={content.mediaUrl} />
      <p className="console-prewrap">
        {content.body || "Your message preview will appear here."}
      </p>
      <Buttons buttons={content.buttons} />
      {Boolean(content.cards?.length) && (
        <div className="console-carousel" aria-label="Carousel card preview">
          {content.cards?.map((card, i) => (
            <article key={card.id}>
              <small>Card {i + 1}</small>
              <Media url={card.mediaUrl} />
              <strong>{card.title || "Card title"}</strong>
              <p>{card.body || "Card message"}</p>
              <Buttons buttons={card.buttons} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
