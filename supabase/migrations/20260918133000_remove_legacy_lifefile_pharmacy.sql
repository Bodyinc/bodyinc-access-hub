-- Remove the placeholder "Legacy LifeFile (configure me)" pharmacy.
-- Medicines must be mapped to a real pharmacy (e.g. Striker) before send.

DELETE FROM public.medicine_life_file_products
WHERE pharmacy_id IN (
  SELECT id
  FROM public.life_file_pharmacies
  WHERE name = 'Legacy LifeFile (configure me)'
     OR api_base_url ILIKE '%example.invalid%'
);

-- provider_life_file_credentials cascade; medication_requests.life_file_pharmacy_id sets null.
DELETE FROM public.life_file_pharmacies
WHERE name = 'Legacy LifeFile (configure me)'
   OR api_base_url ILIKE '%example.invalid%';
