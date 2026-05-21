export const normalizeRenderedWorksheet = (raw: string): string => {
  let text = raw.trim();
  if (!text) return text;

  const fencedMatch = text.match(/```(?:markdown|md)?\s*\r?\n([\s\S]*?)```/i);
  if (fencedMatch) {
    text = fencedMatch[1].trim();
  }

  const commentaryMatch = text.match(
    /^(?:here is|below is|this is)[\s\S]*?(?=\r?\n(?:#{1,6}\s|\*\*(?:Name|Date|Notes):|Name:|Date:))/i
  );
  if (commentaryMatch && commentaryMatch[0].length < text.length) {
    text = text.slice(commentaryMatch[0].length).trimStart();
  }

  return text.trim();
};
