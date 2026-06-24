import { RichText } from "@payloadcms/richtext-lexical/react";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

export default function RichTextRenderer({
  content,
}: {
  content: SerializedEditorState;
}) {
  return (
    <div className="prose prose-lg max-w-none prose-a:text-blue-600">
      <RichText data={content} />
    </div>
  );
}
