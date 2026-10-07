export type GgRatingTexts = [string, string, string, string, string];

export function ggRatingTexts(company: {
  ggRating1: string;
  ggRating2: string;
  ggRating3: string;
  ggRating4: string;
  ggRating5: string;
}): GgRatingTexts {
  return [company.ggRating1, company.ggRating2, company.ggRating3, company.ggRating4, company.ggRating5];
}

export function ggOptionLabel(level: number, texts: readonly string[]) {
  const text = (texts[level - 1] ?? "").trim();
  return text ? `${level} ${text}` : String(level);
}
