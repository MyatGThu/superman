/* Peachy - demo dataset + pure helpers.
 * ponytail: fictional Melbourne venues so no real business's prices are
 * misstated. Real data source (Places API / scraped menus) plugs in here
 * and nothing else changes. Photos: set venue.photo to a URL to replace
 * the generated polaroid art. */

const VENUES = [
  { id: "rosetta", name: "Rosetta Lane", area: "Degraves St, CBD", type: "cafe",
    emoji: "🌹", hue: 340, coffee: 4.20, map: { x: 46, y: 38 },
    dish: { name: "Ricotta hotcakes", price: 14.5, tags: ["veg"], kj: 2350, health: 2 },
    discount: { day: 1, deal: "Monday: any coffee $3" } },
  { id: "petal", name: "Petal & Pour", area: "Fitzroy", type: "cafe",
    emoji: "🌸", hue: 320, coffee: 4.00, map: { x: 70, y: 22 },
    dish: { name: "Acai bowl", price: 12.0, tags: ["vegan", "gf"], kj: 1500, health: 5 },
    discount: { day: 3, deal: "Wed: bowls -20%" } },
  { id: "crumb", name: "Crumb Maison", area: "Hardware Lane, CBD", type: "eats",
    emoji: "🥐", hue: 28, coffee: 4.50, map: { x: 40, y: 30 },
    dish: { name: "Ham & gruyère croissant", price: 9.5, tags: [], kj: 2100, health: 2 },
    discount: { day: 5, deal: "Fri: croissant + coffee $11" } },
  { id: "mama", name: "Mama Linh's", area: "Richmond", type: "eats",
    emoji: "🍜", hue: 12, coffee: 3.80, map: { x: 78, y: 55 },
    dish: { name: "Pho ga (chicken)", price: 13.0, tags: ["gf", "protein"], kj: 1900, health: 4 },
    discount: { day: 2, deal: "Tue: pho $10 before 11:30" } },
  { id: "clover", name: "Clover Greens", area: "Carlton", type: "eats",
    emoji: "🥗", hue: 130, coffee: 4.30, map: { x: 52, y: 14 },
    dish: { name: "Green goddess salad", price: 11.5, tags: ["vegan", "gf"], kj: 1300, health: 5 },
    discount: { day: 4, deal: "Thu: salads -$3 after 2pm" } },
  { id: "duchess", name: "The Little Duchess", area: "South Yarra", type: "cafe",
    emoji: "🫖", hue: 285, coffee: 4.60, map: { x: 58, y: 74 },
    dish: { name: "Earl grey scones (2)", price: 8.0, tags: ["veg"], kj: 1700, health: 2 },
    discount: { day: 0, deal: "Sun: high-tea set $19" } },
  { id: "banh", name: "Banh Mi Blossom", area: "Footscray", type: "eats",
    emoji: "🥖", hue: 45, coffee: 3.50, map: { x: 16, y: 42 },
    dish: { name: "Lemongrass tofu banh mi", price: 8.5, tags: ["vegan"], kj: 1800, health: 4 },
    discount: { day: 1, deal: "Mon: any banh mi $7" } },
  { id: "honey", name: "Honeybee Espresso", area: "Brunswick", type: "cafe",
    emoji: "🐝", hue: 50, coffee: 3.90, map: { x: 44, y: 6 },
    dish: { name: "Honey oat porridge", price: 9.0, tags: ["veg"], kj: 1400, health: 4 },
    discount: { day: 2, deal: "Tue: porridge + long black $10" } },
  { id: "nonna", name: "Nonna Rina", area: "Lygon St, Carlton", type: "eats",
    emoji: "🍝", hue: 0, coffee: 4.10, map: { x: 55, y: 20 },
    dish: { name: "Pasta al pomodoro", price: 14.0, tags: ["veg"], kj: 2600, health: 3 },
    discount: { day: 3, deal: "Wed: pasta + glass of vino $18" } },
  { id: "lotus", name: "Lotus Soup Bar", area: "CBD, Chinatown", type: "eats",
    emoji: "🥟", hue: 200, coffee: 4.00, map: { x: 50, y: 34 },
    dish: { name: "Veggie dumpling soup", price: 10.5, tags: ["veg"], kj: 1600, health: 4 },
    discount: { day: 4, deal: "Thu: 10 dumplings $8" } },
];

/* Book-and-history quote archive - public-domain authors & figures. */
const QUOTES = [
  { text: "It is never too late to be what you might have been.", by: "George Eliot" },
  { text: "We must have perseverance and above all confidence in ourselves.", by: "Marie Curie" },
  { text: "Hope is the thing with feathers that perches in the soul.", by: "Emily Dickinson" },
  { text: "The most difficult thing is the decision to act; the rest is merely tenacity.", by: "Amelia Earhart" },
  { text: "No one can make you feel inferior without your consent.", by: "Eleanor Roosevelt" },
  { text: "I am no bird; and no net ensnares me.", by: "Charlotte Brontë, Jane Eyre" },
  { text: "Every moment is a fresh beginning.", by: "T.S. Eliot" },
  { text: "Very little is needed to make a happy life; it is all within yourself.", by: "Marcus Aurelius" },
  { text: "Luck is what happens when preparation meets opportunity.", by: "Seneca" },
  { text: "Know your own happiness.", by: "Jane Austen, Sense and Sensibility" },
  { text: "There is no charm equal to tenderness of heart.", by: "Jane Austen, Emma" },
  { text: "Although the world is full of suffering, it is also full of the overcoming of it.", by: "Helen Keller" },
  { text: "Every great dream begins with a dreamer.", by: "Harriet Tubman" },
  { text: "I attribute my success to this - I never gave or took any excuse.", by: "Florence Nightingale" },
  { text: "Nothing in life is to be feared, it is only to be understood.", by: "Marie Curie" },
  { text: "One cannot think well, love well, sleep well, if one has not dined well.", by: "Virginia Woolf" },
  { text: "Do what you can, with what you have, where you are.", by: "Theodore Roosevelt" },
  { text: "Whatever you are, be a good one.", by: "attr. Abraham Lincoln" },
  { text: "The question isn't who is going to let me; it's who is going to stop me.", by: "Ayn Rand" },
  { text: "It always seems impossible until it's done.", by: "Nelson Mandela" },
  { text: "Courage, dear heart.", by: "C.S. Lewis" },
  { text: "All that is gold does not glitter; not all those who wander are lost.", by: "J.R.R. Tolkien" },
  { text: "Beware; for I am fearless, and therefore powerful.", by: "Mary Shelley, Frankenstein" },
  { text: "There is some good in this world, and it's worth fighting for.", by: "J.R.R. Tolkien" },
  { text: "We are all in the gutter, but some of us are looking at the stars.", by: "Oscar Wilde" },
  { text: "The secret of getting ahead is getting started.", by: "attr. Mark Twain" },
  { text: "What we achieve inwardly will change outer reality.", by: "Plutarch" },
  { text: "Tomorrow is always fresh, with no mistakes in it yet.", by: "L.M. Montgomery, Anne of Green Gables" },
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/* Deterministic quote of the day: same quote for everyone all day. */
function quoteOfDay(date) {
  const d = date || new Date();
  const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
  return QUOTES[(d.getFullYear() + dayOfYear) % QUOTES.length];
}

function cheapest(venues, key) { // key: v => number
  return venues.reduce((a, b) => (key(b) < key(a) ? b : a));
}

function money(x) { return "$" + x.toFixed(2); }

const api = { VENUES, QUOTES, DAYS, quoteOfDay, cheapest, money };
if (typeof module !== "undefined") module.exports = api;
if (typeof window !== "undefined") Object.assign(window, api);
