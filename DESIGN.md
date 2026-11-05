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

Use the supplied `logo.png` in the shared header brand mark on every page, preserving its original wide aspect ratio.

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

Organize menswear into Babban Riga, Jallabiya, Yar ciki Sets, and Caps & Accessories. Add catalog records to Supabase with `name`, `description`, `price`, `category`, `image_url`, `label`, `featured`, and `active` fields. The current remote Unsplash photos are generic editorial placeholders, not photographs of Hausa garments; use accurate product photography in each `image_url` before launch.

## Interaction Notes

- Header search opens an inline search field and filters matching products; submitted searches open the Shop page with the query applied.
- The shopping bag is available on every page, persists in local storage, and supports quantity changes and item removal.
- The product catalog is read from the Supabase `products` table.
- Checkout submits guest delivery details through the `place_order` database function. The function verifies active product prices in the database and creates a pending order; online payment is not connected.
- Apply `supabase-schema.sql` in the Supabase SQL Editor to create the catalog, orders, policies, and order function. Add catalog records through the Supabase dashboard with one of the supported category slugs.
- The contact form is not connected by the catalog/orders setup and requires its own backend table and access policy.
