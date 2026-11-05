CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 160),
  description text NOT NULL DEFAULT '',
  price numeric(12, 2) NOT NULL CHECK (price >= 0),
  category text NOT NULL CHECK (
    category IN ('babban-riga', 'jallabiya', 'yar-ciki', 'caps-accessories')
  ),
  image_url text NOT NULL,
  label text,
  featured boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  delivery_address text NOT NULL,
  items jsonb NOT NULL CHECK (
    jsonb_typeof(items) = 'array' AND jsonb_array_length(items) > 0
  ),
  subtotal numeric(12, 2) NOT NULL CHECK (subtotal >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'processing', 'completed', 'cancelled')
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.orders FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.place_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_delivery_address text,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  submitted_count integer;
  matched_count integer;
  calculated_subtotal numeric(12, 2);
  verified_items jsonb;
  new_order_id uuid;
BEGIN
  IF char_length(pg_catalog.btrim(coalesce(p_customer_name, ''))) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'Enter a valid name.';
  END IF;

  IF p_customer_email IS NULL OR p_customer_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Enter a valid email address.';
  END IF;

  IF char_length(pg_catalog.btrim(coalesce(p_customer_phone, ''))) NOT BETWEEN 5 AND 40 THEN
    RAISE EXCEPTION 'Enter a valid phone number.';
  END IF;

  IF char_length(pg_catalog.btrim(coalesce(p_delivery_address, ''))) NOT BETWEEN 8 AND 500 THEN
    RAISE EXCEPTION 'Enter a valid delivery address.';
  END IF;

  IF coalesce(pg_catalog.jsonb_typeof(p_items), '') <> 'array' THEN
    RAISE EXCEPTION 'Your order must include at least one product.';
  END IF;

  IF pg_catalog.jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Your order must include at least one product.';
  END IF;

  SELECT pg_catalog.count(*)::integer
    INTO submitted_count
    FROM pg_catalog.jsonb_array_elements(p_items);

  SELECT
    pg_catalog.count(*)::integer,
    pg_catalog.round(coalesce(pg_catalog.sum(product.price * requested.quantity), 0), 2),
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'product_id', product.id,
        'name', product.name,
        'quantity', requested.quantity,
        'unit_price', product.price
      )
    )
    INTO matched_count, calculated_subtotal, verified_items
    FROM (
      SELECT
        (entry.value ->> 'product_id')::uuid AS product_id,
        (entry.value ->> 'quantity')::integer AS quantity
      FROM pg_catalog.jsonb_array_elements(p_items) AS entry(value)
    ) AS requested
    JOIN public.products AS product
      ON product.id = requested.product_id
      AND product.active = true
    WHERE requested.quantity BETWEEN 1 AND 20;

  IF matched_count <> submitted_count THEN
    RAISE EXCEPTION 'One or more products are unavailable. Refresh the collection and try again.';
  END IF;

  INSERT INTO public.orders (
    customer_name,
    customer_email,
    customer_phone,
    delivery_address,
    items,
    subtotal,
    status
  )
  VALUES (
    pg_catalog.btrim(p_customer_name),
    pg_catalog.btrim(p_customer_email),
    pg_catalog.btrim(p_customer_phone),
    pg_catalog.btrim(p_delivery_address),
    verified_items,
    calculated_subtotal,
    'pending'
  )
  RETURNING id INTO new_order_id;

  RETURN new_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.place_order(text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(text, text, text, text, jsonb) TO anon, authenticated;
