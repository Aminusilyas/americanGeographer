---
name: American Geographer
colors:
  background: "#fbf8f1"
  surface: "#ffffff"
  surface-soft: "#f3efe5"
  primary: "#80601f"
  primary-strong: "#b28a3c"
  accent-gold: "#c69b45"
  text: "#211f1a"
  text-muted: "#645d51"
typography:
  headings: Epilogue
  body: Plus Jakarta Sans
layout:
  mobile-first: true
  max-width: 760px
  navigation: fixed bottom bar
---

## Brand & Style

American Geographer presents high-end Hausa traditional menswear with modern elegance. The visual identity pairs warm neutrals, dark charcoal, and restrained golden accents with clean typography and editorial product photography.

The experience should feel considered and easy to browse: highlight Babban Riga, Jallabiya, Yar ciki sets, and traditional caps and accessories, while keeping product details scannable on mobile and desktop.

## Colors

- **Warm canvas (`#FBF8F1`)** keeps the page light and comfortable.
- **Charcoal (`#211F1A`)** anchors headings, navigation, and high-contrast text.
- **Golden brown (`#80601F`) and warm gold (`#B28A3C`, `#C69B45`)** identify the brand and emphasize active states, buttons, and small details.
- **White and soft sand (`#FFFFFF`, `#F3EFE5`)** separate product cards, information panels, and form fields.

## Typography

- **Headings:** Epilogue, with bold weights for a confident editorial feel.
- **Body and controls:** Plus Jakarta Sans for readable product details, prices, and navigation.
- Keep descriptions concise and prices easy to scan.

## Layout & Components

- A mobile-first canvas expands to a 760px content width on larger screens.
- A sticky top bar identifies the brand; a fixed bottom navigation connects Home, About, Shop, and Contact.
- Featured pieces use horizontal cards. The collection uses a two-column product grid with image, category label, name, description, price, and add-to-bag control.
- Category chips filter the visible collection. Keep their labels short and horizontally scrollable on narrow screens.
- Cards use soft shadows and rounded corners; gold is an accent rather than a large-area background color.

## Product Content

Organize menswear into Babban Riga, Jallabiya, Yar ciki Sets, and Caps & Accessories. The current remote Unsplash photos are generic editorial placeholders, not photographs of the listed Hausa garments; replace them with accurate product photography and alt text before launch. Product titles, descriptions, and prices in the current HTML are also demonstration content.

## Interaction Notes

- Header search opens an inline search field and filters matching products; submitted searches open the Shop page with the query applied.
- The shopping bag is available on every page, persists in local storage, and supports quantity changes and item removal.
- Checkout is a front-end placeholder; payment and order processing are not connected.
- The contact form requires Supabase configuration in `script.js` and a matching `contact_messages` table before it can deliver messages.
