export type WeddingEvent = {
  id: string;
  name: string;
  date: string;
  timeLabel: string;
};

// Initial schedule only. The database becomes the source of truth when connected.
export const weddingEvents: WeddingEvent[] = [
  { id: "kasar", name: "Kasar", date: "2027-02-01", timeLabel: "Morning · exact time to be announced" },
  { id: "mehendi", name: "Mehendi", date: "2027-02-01", timeLabel: "Time to be announced" },
  { id: "vajan", name: "Vajan", date: "2027-02-02", timeLabel: "Time to be announced" },
  { id: "wedding", name: "Wedding", date: "2027-02-03", timeLabel: "Time to be announced" },
  { id: "reception", name: "Reception", date: "2027-02-05", timeLabel: "Time to be announced" },
  { id: "helping", name: "Helping the Less Fortunate", date: "2027-02-06", timeLabel: "Time to be announced" },
];
