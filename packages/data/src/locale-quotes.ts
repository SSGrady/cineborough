import quotes from "../../../data/mock/locale-quotes.json";

export interface LocaleQuote {
  zip: string;
  neighborhood: string;
  text: string;
  source: string;
}

export function getLocaleQuote(zip: string): LocaleQuote | undefined {
  return quotes.quotes.find((q) => q.zip === zip);
}
